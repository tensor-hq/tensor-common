import { PublicKey } from '@solana/web3.js';

export const BUBBLEGUM_PROGRAM_ID = new PublicKey(
  'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
);

export const findBubblegumSignerPda = (
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collection_cpi')],
    programId,
  );
};

export const findBubblegumTreeAuthorityPda = (
  merkleTree: PublicKey,
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([merkleTree.toBytes()], programId);
};

export const findBubblegumMintAuthorityPda = (
  mint: PublicKey,
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([mint.toBytes()], programId);
};
