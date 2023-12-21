import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import semaphore from 'semaphore';

export class TimeoutError extends Error {}

/// Equivalent to Omit<Bob, "foo"> & {foo: string};
export type Overwrite<T, NewT> = Omit<T, keyof NewT> & NewT;

export const rejectAfterDelay = (ms: number) =>
  new Promise((_, reject) => {
    setTimeout(reject, ms, new TimeoutError(`timeout of ${ms}ms exceeded`));
  });

export const settleAllWithTimeout = async <T>(
  promises: Array<Promise<T>>,
  timeoutMs: number,
): Promise<Array<T>> => {
  const values: T[] = [];

  await Promise.allSettled(
    promises.map((promise) =>
      Promise.race([promise, rejectAfterDelay(timeoutMs)]),
    ),
  ).then((result) =>
    result.forEach((d) => {
      if (d.status === 'fulfilled') {
        values.push(d.value as T);
      }
    }),
  );

  return values;
};

export type Maybe<T> = T | null | undefined;

export const isNullLike = <T>(v: Maybe<T>): v is null | undefined =>
  v === null || v === undefined;

export const filterNullLike = <T>(arr: Maybe<T>[]) =>
  arr.filter((v): v is T => !isNullLike(v));

/**
 * Unflattens an object with keys:
 * {abc: 1, 'foo.abc': 2, 'bar.abc': 2}
 * into:
 * {abc: 1, foo: {abc: 2}, bar: {abc: 2}}
 */
export const unflattenFields = (record: Record<string, any>) => {
  const ret: Record<string, any> = {};
  Object.entries(record).forEach(([k, v]) => {
    const toks = k.split('.');
    let ref = ret;
    toks.forEach((tok, idx) => {
      // At leaf token: assign value.
      if (idx === toks.length - 1) {
        ref[tok] = v;
        return;
      }
      // Non-leaf token: create nested object.
      ref[tok] ??= {};
      ref = ref[tok];
    });
  });
  return ret;
};

//https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
export const toHexString = (byteArray: number[]): string => {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
};

export const hexCode = (decCode: number) => '0x' + decCode.toString(16);

export const makeBatches = <T>(
  items: Array<T>,
  batchSize: number,
): Array<Array<T>> => {
  const out: T[][] = [];
  for (let idx = 0; idx < items.length; idx += batchSize) {
    out.push(items.slice(idx, idx + batchSize));
  }
  return out;
};

export const partitionByKey = <T>(
  arr: Array<T>,
  getKey: (item: T) => Maybe<string>,
) => {
  // Important to make partial to denote that for any arbitrary key
  // there may not be a value.
  const out: Partial<Record<string, T[]>> = {};
  arr.forEach((item) => {
    const k = getKey(item);
    if (isNullLike(k)) return;
    out[k] ??= [];
    out[k]!.push(item);
  });
  return out;
};

export const partitionByKeySingle = <T>(
  arr: Array<T>,
  getKey: (item: T) => Maybe<string>,
) => {
  // Important to make partial to denote that for any arbitrary key
  // there may not be a value.
  const out: Partial<Record<string, T>> = {};
  arr.forEach((item) => {
    const k = getKey(item);
    if (isNullLike(k)) return;
    out[k] = item;
  });
  return out;
};

/** Earlier items take precedence IF `getKey` is specified. */
export const dedupeList = <T, K>(arr: Array<T>, getKey?: (item: T) => K) => {
  if (!getKey) {
    return [...new Set(arr)];
  }

  const seen = new Set();
  const out: T[] = [];
  for (const item of arr) {
    const k = getKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

export const parseDate = (date: string | Date) => {
  return new Date(date);
};

export const runWithSem = <T>(
  sem: semaphore.Semaphore,
  fn: () => Promise<T>,
): Promise<T> => {
  return new Promise((res, rej) => {
    sem.take(async () => {
      try {
        res(await fn());
      } catch (err) {
        rej(err);
      } finally {
        sem.leave();
      }
    });
  });
};

/** Differs from lodash's capitalize since it doesn't lower case everything else. */
export const capitalize = (str: string) => {
  if (!str.length) return str;
  return str[0].toUpperCase() + str.slice(1);
};

export const eqSet = <T>(xs: Set<T>, ys: Set<T>) =>
  xs.size === ys.size && [...xs].every((x) => ys.has(x));

export const nameToBuffer = (name: string, bytes: number = 32) => {
  return Buffer.from(name.padEnd(bytes, '\0')).toJSON().data.slice(0, bytes);
};

export const bufferToName = (buf: Buffer) => {
  return buf.toString('utf8').trim().replaceAll(/\x00/g, '');
};

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const equalWithNull = <T>(
  a: Maybe<T>,
  b: Maybe<T>,
  eqFn?: (a: T, b: T) => boolean,
) =>
  isNullLike(a)
    ? isNullLike(b)
      ? true
      : false
    : isNullLike(b)
    ? false
    : isNullLike(eqFn)
    ? a === b
    : eqFn(a, b);

/** Amortized O(n) complexity */
export const removeNullBytes = (str: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) !== 0) {
      result += str[i]; // concatenations are optimized in modern browsers
    }
  }
  return result;
};

/** Removes keys that have undefined values */
export const removeUndefinedKeys = (obj: object) => {
  const newObj: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      newObj[k] = v;
    }
  }
  return newObj;
};

//#region Stringify function.

export const stringifyPKsAndBNs = (i: any) => {
  if (_isPk(i)) {
    return (<PublicKey>i).toBase58();
  } else if (i instanceof BN) {
    return i.toString();
  } else if (_parseType(i) === 'array') {
    return _stringifyPKsAndBNInArray(i);
  } else if (_parseType(i) === 'object') {
    return _stringifyPKsAndBNsInObject(i);
  }
  return i;
};

const _isPk = (obj: any): boolean => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj['toBase58'] === 'function'
  );
};

const _stringifyPKsAndBNsInObject = (o: any) => {
  const newO = { ...o };
  for (const [k, v] of Object.entries(newO)) {
    if (_isPk(v)) {
      newO[k] = (<PublicKey>v).toBase58();
    } else if (v instanceof BN) {
      newO[k] = (v as BN).toString();
    } else if (_parseType(v) === 'array') {
      newO[k] = _stringifyPKsAndBNInArray(v as any);
    } else if (_parseType(v) === 'object') {
      newO[k] = _stringifyPKsAndBNsInObject(v);
    } else {
      newO[k] = v;
    }
  }
  return newO;
};

const _stringifyPKsAndBNInArray = (a: any[]): any[] => {
  const newA: any[] = [];
  for (const i of a) {
    if (_isPk(i)) {
      newA.push(i.toBase58());
    } else if (i instanceof BN) {
      newA.push(i.toString());
    } else if (_parseType(i) === 'array') {
      newA.push(_stringifyPKsAndBNInArray(i));
    } else if (_parseType(i) === 'object') {
      newA.push(stringifyPKsAndBNs(i));
    } else {
      newA.push(i);
    }
  }
  return newA;
};

const _parseType = <T>(v: T): string => {
  if (v === null || v === undefined) {
    return 'null';
  }
  if (typeof v === 'object') {
    if (v instanceof Array) {
      return 'array';
    }
    if (v instanceof Date) {
      return 'date';
    }
    return 'object';
  }
  return typeof v;
};

//#endregion
