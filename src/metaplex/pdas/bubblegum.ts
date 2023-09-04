import { PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum';
import { PublicKey } from '@solana/web3.js';

export const findBubblegumSignerPda = (programId: PublicKey = PROGRAM_ID) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collection_cpi')],
    programId,
  );
};

export const findBubblegumTreeAuthorityPda = (
  merkleTree: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([merkleTree.toBytes()], programId);
};

export const findBubblegumMintAuthorityPda = (
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([mint.toBytes()], programId);
};
