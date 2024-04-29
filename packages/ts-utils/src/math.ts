import BN from 'bn.js';
import { Big } from 'big.js';
import { Maybe, isNullLike } from '.';

export const sum = (arr: Array<number>) => {
  return arr.reduce((a, b) => a + b, 0);
};

// ===== dates =====

export const minDate = (a: Date, b: Date) => (a < b ? a : b);
export const maxDate = (a: Date, b: Date) => (a > b ? a : b);

// ===== bigints =====

export const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b);
export const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b);
export const sqBigInt = (a: bigint) => a * a;

export const minBigInts = (arr: bigint[]) => {
  if (!arr.length) return null;
  let min = arr[0];
  arr.slice(1).forEach((v) => {
    min = minBigInt(min, v);
  });
  return min;
};

export const maxBigInts = (arr: bigint[]) => {
  if (!arr.length) return null;
  let min = arr[0];
  arr.slice(1).forEach((v) => {
    min = maxBigInt(min, v);
  });
  return min;
};

// ===== Bigs =====
export const validBigStr = (s: string) => {
  try {
    new Big(s);
    return true;
  } catch (err) {
    return false;
  }
};
export const sumBig = (arr: Array<Big>): Big => {
  return arr.reduce((a, b) => a.add(b), new Big(0));
};

export const sumBN = (arr: Array<BN>): BN => {
  return arr.reduce((a, b) => a.add(b), new BN(0));
};

// ===== Bigs/BNs =====

export function minBigBN(a: Big, b: Big): Big;
export function minBigBN(a: BN, b: BN): BN;
export function minBigBN(a: any, b: any) {
  return a.lt(b) ? a : b;
}
export function maxBigBN(a: Big, b: Big): Big;
export function maxBigBN(a: BN, b: BN): BN;
export function maxBigBN(a: any, b: any) {
  return a.gt(b) ? a : b;
}

export function minBigsBNs(arr: Big[]): Big | null;
export function minBigsBNs(arr: BN[]): BN | null;
export function minBigsBNs(arr: any[]) {
  if (!arr.length) return null;
  let min = arr[0];
  arr.slice(1).forEach((v) => {
    min = minBigBN(min, v);
  });
  return min;
}

export function maxBigsBNs(arr: Big[]): Big | null;
export function maxBigsBNs(arr: BN[]): BN | null;
export function maxBigsBNs(arr: any[]) {
  if (!arr.length) return null;
  let max = arr[0];
  arr.slice(1).forEach((v) => {
    max = maxBigBN(max, v);
  });
  return max;
}

export const sortNumberOrBig = (
  a: Big | BN | number | null | undefined,
  b: Big | BN | number | null | undefined,
  /** If true, means nulls sort before all other non-null values.
   * NB: sorting before other values means it will:
   *  - come first if you're sorting in ASC order
   *  - come last if you're sorting in DESC order
   */
  nullsFirst: boolean = true,
): number => {
  if (isNullLike(a) && isNullLike(b)) return 0;
  if (isNullLike(a)) return nullsFirst ? -1 : 1;
  if (isNullLike(b)) return nullsFirst ? 1 : -1;

  if (typeof a !== 'number') a = a.toNumber();
  if (typeof b !== 'number') b = b.toNumber();
  return a - b;
};

export const sortBigInt = (
  a: Maybe<bigint>,
  b: Maybe<bigint>,
  /** If true, means nulls sort before all other non-null values.
   * NB: sorting before other values means it will:
   *  - come first if you're sorting in ASC order
   *  - come last if you're sorting in DESC order
   */
  nullsFirst: boolean = true,
): number => {
  if (isNullLike(a) && isNullLike(b)) return 0;
  if (isNullLike(a)) return nullsFirst ? -1 : 1;
  if (isNullLike(b)) return nullsFirst ? 1 : -1;

  return Number(a - b);
};

// Round in case there are decimals.
export const bigToBN = (big: Big) => new BN(big.round().toString());
export const BNToBig = (bn: BN) => new Big(bn.toString());
