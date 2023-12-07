import {
  AuthorizationData,
  createTransferInstruction,
  Metadata,
  TransferArgs,
  TransferInstructionAccounts,
  TransferInstructionArgs,
} from '@metaplex-foundation/mpl-token-metadata';
export { AuthorizationData } from '@metaplex-foundation/mpl-token-metadata';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js';
import { fetchMetadataAcct } from './token_metadata';
import { AUTH_PROGRAM_ID, findEditionPda, findTokenRecordPda } from './pdas';

export const prepPnftAccounts = async ({
  connection,
  metaCreators,
  nftMint,
  sourceAta,
  destAta,
  authData = null,
}: {
  connection: Connection;
  metaCreators?: {
    metadata: PublicKey;
    creators: PublicKey[];
  };
  nftMint: PublicKey;
  sourceAta: PublicKey;
  destAta: PublicKey;
  authData?: AuthorizationData | null;
}) => {
  let meta: PublicKey;
  let creators: PublicKey[];
  let ruleSet: PublicKey | undefined;
  if (metaCreators) {
    meta = metaCreators.metadata;
    creators = metaCreators.creators;
    const inflatedMeta = await Metadata.fromAccountAddress(connection, meta);
    ruleSet = inflatedMeta.programmableConfig?.ruleSet ?? undefined;
  } else {
    const metadata = await fetchMetadataAcct(connection, nftMint);
    meta = metadata.address;
    creators = metadata.creators?.map((c) => c.address) ?? [];
    ruleSet = metadata.account.programmableConfig?.ruleSet ?? undefined;
  }

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
    creators,
    ownerTokenRecordBump,
    ownerTokenRecordPda,
    destTokenRecordBump,
    destTokenRecordPda,
    ruleSet,
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
}: {
  mint: PublicKey;
  tokenOwner: PublicKey;
  destinationOwner: PublicKey;
  authority?: PublicKey | null;
  args?: TransferArgs | null;
  connection: Connection;
  fromAddr: PublicKey;
  toAddr: PublicKey;
}) => {
  const {
    ruleSet,
    nftEditionPda,
    meta,
    ownerTokenRecordPda,
    destTokenRecordPda,
  } = await prepPnftAccounts({
    connection,
    nftMint: mint,
    sourceAta: fromAddr,
    destAta: toAddr,
  });

  const transferAcccounts: TransferInstructionAccounts = {
    authority: authority ?? tokenOwner,
    tokenOwner,
    token: fromAddr,
    mint,
    metadata: meta,
    edition: nftEditionPda,
    destinationOwner,
    destination: toAddr,
    payer: tokenOwner,
    splTokenProgram: TOKEN_PROGRAM_ID,
    splAtaProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    authorizationRules: ruleSet,
    authorizationRulesProgram: AUTH_PROGRAM_ID,
    ownerTokenRecord: ownerTokenRecordPda,
    destinationTokenRecord: destTokenRecordPda,
  };

  if (!args) {
    args = {
      __kind: 'V1',
      amount: 1,
      authorizationData: null,
    };
  }

  // not sure needed (keeping around in case changes, to quickly remember command)
  // const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  //   units: 400_000,
  // });

  const transferArgs: TransferInstructionArgs = {
    transferArgs: args,
  };

  const transferIx = createTransferInstruction(transferAcccounts, transferArgs);

  return transferIx;
};
