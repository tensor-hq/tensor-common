import BN from 'bn.js';
import { Big } from 'big.js';
import { isNullLike } from './utils';

export const sum = (arr: Array<number>) => {
  return arr.reduce((a, b) => a + b, 0);
};

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

export const minBig = (a: Big, b: Big) => (a.lt(b) ? a : b);
export const maxBig = (a: Big, b: Big) => (a.gt(b) ? a : b);

export const minBigs = (arr: Big[]) => {
  if (!arr.length) return null;
  let min = arr[0];
  arr.slice(1).forEach((v) => {
    min = minBig(min, v);
  });
  return min;
};

export const maxBigs = (arr: Big[]) => {
  if (!arr.length) return null;
  let max = arr[0];
  arr.slice(1).forEach((v) => {
    max = maxBig(max, v);
  });
  return max;
};

export const sortNumberOrBig = (
  a: Big | BN | number | null | undefined,
  b: Big | BN | number | null | undefined,
  // If true, means nulls sort before all other non-null values.
  nullsFirst: boolean = true,
): number => {
  if (isNullLike(a) && isNullLike(b)) return 0;
  if (isNullLike(a)) return nullsFirst ? -1 : 1;
  if (isNullLike(b)) return nullsFirst ? 1 : -1;

  if (typeof a !== 'number') a = a.toNumber();
  if (typeof b !== 'number') b = b.toNumber();
  return a - b;
};

// Round in case there are decimals.
export const bigToBN = (big: Big) => new BN(big.round().toString());
export const BNToBig = (bn: BN) => new Big(bn.toString());
