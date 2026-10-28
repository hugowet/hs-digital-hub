/** A bounded queue must drain even when no further card enqueues a request. */
export function createQuoteBatcher<T, R>(run: (items: T[]) => Promise<R>, limit = 24, delay = 80) {
  let pending: Array<{ item: T; resolve: (result: R) => void; reject: (error: unknown) => void }> = [];
  let running = false;
  let scheduled = false;
  const drain = async () => {
    scheduled = false;
    if (running) return;
    running = true;
    try {
      while (pending.length) {
        const batch = pending.splice(0, limit);
        try {
          const result = await run(batch.map((entry) => entry.item));
          batch.forEach((entry) => entry.resolve(result));
        } catch (error) {
          batch.forEach((entry) => entry.reject(error));
        }
      }
    } finally { running = false; }
  };
  return (item: T): Promise<R> => new Promise((resolve, reject) => {
    pending.push({ item, resolve, reject });
    if (!running && !scheduled) {
      scheduled = true;
      setTimeout(() => void drain(), delay);
    }
  });
}