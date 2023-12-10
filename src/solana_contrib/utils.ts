import { AccountClient } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { ACCOUNT_SIZE } from '@solana/spl-token';

export const validPublicKey = (input: string) => {
  try {
    new PublicKey(input);
    return true;
  } catch (err: any) {
    return false;
  }
};

export const getRent = (
  conn: Connection,
  acct: AccountClient,
): Promise<number> => {
  return conn.getMinimumBalanceForRentExemption(acct.size);
};
// based on https://docs.solana.com/developing/programming-model/accounts#:~:text=The%20current%20maximum%20size%20of,per%20account%20and%20per%20instruction.
export const getRentSync = (dataSize: number) =>
  Math.trunc(19.055441478439427 * (128 + dataSize) * 365.25);
export const TOKEN_ACC_RENT = getRentSync(ACCOUNT_SIZE);

export const getLamports = async (
  conn: Connection,
  acct: PublicKey,
): Promise<number | undefined> => {
  return (await conn.getAccountInfo(acct))?.lamports;
};

export const numToi32Bytes = (num: number) => {
  // Ensure number is a 32-bit signed integer
  if (num > 2147483647 || num < -2147483648) {
    throw new Error('Number out of range for i32');
  }

  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    // Take the lowest 8 bits of the number and store them in the current byte
    bytes[i] = num & 0xff;
    // Right-shift the number by 8 bits to prepare for the next byte extraction
    num >>= 8;
  }
  return bytes;
};

export const numToU64Bytes = (num: number) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(num), true); // true for little endian
  return new Uint8Array(buffer);
};

export const numToU32Bytes = (num: number) => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, num, true); // true for little endian
  return new Uint8Array(buffer);
};

export const numToU8Bytes = (num: number) => {
  const buffer = new ArrayBuffer(1);
  const view = new DataView(buffer);
  view.setUint8(0, num);
  return new Uint8Array(buffer);
};

export const isUserRejectedSigningError = (err: any) => {
  return (
    // name vs types since some wallets may return generic error.
    err.name === 'WalletSignTransactionError' &&
    ['User rejected the request.', 'Transaction rejected'].includes(err.message)
  );
};
