export const rejectAfterDelay = (ms: number) =>
  new Promise((_, reject) => {
    setTimeout(reject, ms, new Error('timeout'));
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
