import {
  AuthorizationData,
  transferV1,
  Metadata,
  TokenStandard,
  TransferArgs,
  TransferV1InstructionAccounts,
  TransferV1InstructionArgs,
  Creator,
  PayloadType,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { publicKey, createNoopSigner, unwrapOption, isSome, none } from '@metaplex-foundation/umi';
import { findEditionPda, findTokenRecordPda } from './pdas';
import { fetchMetadataByMint } from './token_metadata';
import { defaultUmi } from '../utils';
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
export { AuthorizationData } from '@metaplex-foundation/mpl-token-metadata';

export type PnftAccountsReturn = {
  meta: {
    address: PublicKey;
    metadata: Metadata | null;
  };
  creators: Creator[];
  ruleSet?: PublicKey;
  ownerTokenRecordBump: number;
  ownerTokenRecordPda: PublicKey;
  destTokenRecordBump: number;
  destTokenRecordPda: PublicKey;
  nftEditionPda: PublicKey;
  authDataSerialized?: {
    payload: {
      name: string;
      payload: PayloadType;
    }[];
  } | null;
}

export const prepPnftAccounts = async ({
  connection,
  meta,
  nftMint,
  sourceAta,
  destAta,
  authData = null,
}: {
  connection: Connection;
  /** If provided, skips RPC call for the the metadata account */
  meta?: {
    address: PublicKey;
    metadata: Metadata;
  };
  nftMint: PublicKey;
  sourceAta: PublicKey;
  destAta: PublicKey;
  authData?: AuthorizationData | null;
}): Promise<PnftAccountsReturn> => {
  if (!meta) {
    const { address, metadata } = await fetchMetadataByMint(
      connection,
      nftMint,
    );
    if (!metadata)
      throw new Error(`metadata account not found for mint ${nftMint}`);
    meta = {
      address,
      metadata,
    };
  }
  const creators = meta.metadata.creators ?? [];
  const ruleSet = unwrapOption(meta.metadata.programmableConfig)?.ruleSet ?? undefined;

  const [ownerTokenRecordPda, ownerTokenRecordBump] = findTokenRecordPda(
    nftMint,
    sourceAta,
  );
  const [destTokenRecordPda, destTokenRecordBump] = findTokenRecordPda(
    nftMint,
    destAta,
  );

  //retrieve edition PDA
  const [nftEditionPda] = findEditionPda(nftMint);

  //have to re-serialize due to anchor limitations
  const authDataSerialized = authData
    ? {
        payload: Object.entries(authData.payload.map).map(([k, v]) => {
          return { name: k, payload: v };
        }),
      }
    : null;

  return {
    meta,
    creators: unwrapOption(creators) ?? [],
    ruleSet: ruleSet && isSome(ruleSet) ? new PublicKey(unwrapOption(ruleSet)!) : undefined,
    ownerTokenRecordBump,
    ownerTokenRecordPda,
    destTokenRecordBump,
    destTokenRecordPda,
    nftEditionPda,
    authDataSerialized,
  };
};

export const makePnftTransferIx = async ({
  mint,
  tokenOwner,
  destinationOwner,
  authority = null,
  args = null,
  connection,
  fromAddr,
  toAddr,
  tokenProgram,
}: {
  mint: PublicKey;
  tokenOwner: PublicKey;
  destinationOwner: PublicKey;
  authority?: PublicKey | null;
  args?: TransferArgs | null;
  connection: Connection;
  fromAddr: PublicKey;
  toAddr: PublicKey;
  tokenProgram: PublicKey;
}): Promise<TransactionInstruction> => {
  const {
    meta,
    ruleSet,
    nftEditionPda,
    ownerTokenRecordPda,
    destTokenRecordPda,
  } = await prepPnftAccounts({
    connection,
    nftMint: mint,
    sourceAta: fromAddr,
    destAta: toAddr,
  });

  const transferAcccounts: TransferV1InstructionAccounts = {
    authority: authority ? createNoopSigner(publicKey(authority)) : createNoopSigner(publicKey(tokenOwner)),
    tokenOwner: publicKey(tokenOwner),
    token: publicKey(fromAddr),
    mint: publicKey(mint),
    metadata: publicKey(meta.address),
    edition: publicKey(nftEditionPda),
    destinationOwner: publicKey(destinationOwner),
    destinationToken: publicKey(toAddr),
    payer: createNoopSigner(publicKey(tokenOwner)),
    splTokenProgram: publicKey(tokenProgram),
    authorizationRules: ruleSet ? publicKey(ruleSet) : undefined,
    tokenRecord: publicKey(ownerTokenRecordPda),
    destinationTokenRecord: publicKey(destTokenRecordPda),
  };

  // not sure needed (keeping around in case changes, to quickly remember command)
  // const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  //   units: 400_000,
  // });

  // TODO: could be ProgrammableNonFungibleEdition? 
  // unsure if that was triaged within createTransferInstruction before?
  const transferArgs: TransferV1InstructionArgs = args ?
  {
    ...args,
    tokenStandard: TokenStandard.ProgrammableNonFungible,
  } : {
    amount: 1,
    tokenStandard: TokenStandard.ProgrammableNonFungible,
  }
  const transferIx = transferV1(defaultUmi, {...transferAcccounts, ...transferArgs}).getInstructions()[0];
  return toWeb3JsInstruction(transferIx);
};
