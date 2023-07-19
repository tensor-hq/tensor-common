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

export const makeBatches = <T>(
  items: Array<T>,
  batchSize: number,
): Array<Array<T>> => {
  const out = [];
  for (let idx = 0; idx < items.length; idx += batchSize) {
    out.push(items.slice(idx, idx + batchSize));
  }
  return out;
};

/** Earlier items take precedence. */
export const dedupeList = <T, K>(arr: Array<T>, getKey?: (item: T) => K) => {
  if (!getKey) {
    // Fast path without selector func
    return [...new Set(arr)];
  }

  const seen = new Set();
  const out = [];
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
