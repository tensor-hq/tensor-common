import { PublicKey } from '@solana/web3.js';

export const validPublicKey = (input: string) => {
  try {
    new PublicKey(input);
    return true;
  } catch (err: any) {
    return false;
  }
};
