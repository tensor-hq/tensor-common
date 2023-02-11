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

/// Unflattens an object with keys:
/// {abc: 1, 'foo.abc': 2, 'bar.abc': 2}
/// into:
/// {abc: 1, foo: {abc: 2}, bar: {abc: 2}}
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
