import {
  AuthorizationData,
  createTransferInstruction,
  Metadata,
  TransferArgs,
  TransferInstructionAccounts,
  TransferInstructionArgs,
} from '@metaplex-foundation/mpl-token-metadata';
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
import { AUTH_PROGRAM_ID, findEditionPda, findTokenRecordPda } from './pdas';
import { fetchMetadataByMint } from './token_metadata';
export { AuthorizationData } from '@metaplex-foundation/mpl-token-metadata';

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
}) => {
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
  const creators = meta.metadata.data.creators ?? [];
  const ruleSet = meta.metadata.programmableConfig?.ruleSet ?? undefined;

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
    ruleSet,
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

  const transferAcccounts: TransferInstructionAccounts = {
    authority: authority ?? tokenOwner,
    tokenOwner,
    token: fromAddr,
    mint,
    metadata: meta.address,
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
