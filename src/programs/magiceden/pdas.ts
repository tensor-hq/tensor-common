import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { ME_AH_ADDRESS, ME_PROGRAM } from './shared';

export const generateMEDepositPda = (owner: string) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('m2'),
      new PublicKey(ME_AH_ADDRESS).toBytes(),
      new PublicKey(owner).toBytes(),
    ],
    new PublicKey(ME_PROGRAM),
  );
};

export const generateMEBidPda = (owner: string, mint: string) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('m2'),
      new PublicKey(owner).toBytes(),
      new PublicKey(ME_AH_ADDRESS).toBytes(),
      new PublicKey(mint).toBytes(),
    ],
    new PublicKey(ME_PROGRAM),
  );
};

export const generateMEListingPda = (
  owner: string,
  mint: string,
  tokenAcc?: string,
) => {
  tokenAcc ??= getAssociatedTokenAddressSync(
    new PublicKey(mint),
    new PublicKey(owner),
  ).toBase58();

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('m2'),
      new PublicKey(owner).toBytes(),
      new PublicKey(ME_AH_ADDRESS).toBytes(),
      new PublicKey(tokenAcc).toBytes(),
      new PublicKey(mint).toBytes(),
    ],
    new PublicKey(ME_PROGRAM),
  );
};
