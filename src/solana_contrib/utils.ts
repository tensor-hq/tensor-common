import { AccountClient } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export const validPublicKey = (input: string) => {
  try {
    new PublicKey(input);
    return true;
  } catch (err: any) {
    return false;
  }
};

export const getAccountRent = (
  conn: Connection,
  acct: AccountClient,
): Promise<number> => {
  return conn.getMinimumBalanceForRentExemption(acct.size);
};
// based on https://docs.solana.com/developing/programming-model/accounts#:~:text=The%20current%20maximum%20size%20of,per%20account%20and%20per%20instruction.
export const getAccountRentSync = (dataSize: number) =>
  Math.trunc(19.055441478439427 * (128 + dataSize) * 365.25);
