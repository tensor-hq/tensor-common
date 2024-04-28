import { Connection, PublicKey } from '@solana/web3.js';

export const validPublicKey = (input: string) => {
  try {
    new PublicKey(input);
    return true;
  } catch (err: any) {
    return false;
  }
};

// based on https://docs.solana.com/developing/programming-model/accounts#:~:text=The%20current%20maximum%20size%20of,per%20account%20and%20per%20instruction.
export const getRentSync = (dataSize: number) =>
  Math.trunc(19.055441478439427 * (128 + dataSize) * 365.25);

export const getLamports = async (
  conn: Connection,
  acct: PublicKey,
): Promise<number | undefined> => {
  return (await conn.getAccountInfo(acct))?.lamports;
};

export const isUserRejectedSigningError = (err: any) => {
  return (
    // name vs types since some wallets may return generic error.
    err.name === 'WalletSignTransactionError' &&
    ['User rejected the request.', 'Transaction rejected'].includes(err.message)
  );
};
