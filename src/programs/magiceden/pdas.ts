import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { ME_AH_ADDRESS, ME_PROGRAM } from './shared';

export const generateMEDepositPda = (
  owner: string,
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from('m2'),
      new PublicKey(ME_AH_ADDRESS).toBytes(),
      new PublicKey(owner).toBytes(),
    ],
    new PublicKey(ME_PROGRAM),
  );
};

export const generateMEBidPda = (
  owner: string,
  mint: string,
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from('m2'),
      new PublicKey(owner).toBytes(),
      new PublicKey(ME_AH_ADDRESS).toBytes(),
      new PublicKey(mint).toBytes(),
    ],
    new PublicKey(ME_PROGRAM),
  );
};

export const generateMEListingPda = async (
  owner: string,
  mint: string,
): Promise<[PublicKey, number]> => {
  const tokenAcc = await getAssociatedTokenAddress(
    new PublicKey(mint),
    new PublicKey(owner),
  );

  return PublicKey.findProgramAddress(
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
