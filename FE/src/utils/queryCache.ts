/** Module-level stale-while-revalidate cache with request dedup.
 *  Returns cached data immediately when fresh, otherwise awaits the fetcher.
 *  Revalidates in background after `staleAfter` ms (default 30s). */

interface Entry<T> {
  status: "fresh" | "stale" | "empty";
  data: T | undefined;
  fetchedAt: number;
  inFlight?: Promise<T>;
}

type Fetcher<T> = () => Promise<T>;

const store = new Map<string, Entry<unknown>>();

export interface QueryOptions {
  /** ms after which the cached value is considered stale and triggers background revalidation. default 30_000 */
  staleAfter?: number;
  /** ms after which the cached value is considered expired and must be refetched. default 5 * staleAfter */
  expireAfter?: number;
}

export async function querySWR<T>(
  key: string,
  fetcher: Fetcher<T>,
  opts: QueryOptions = {},
): Promise<T> {
  const staleAfter = opts.staleAfter ?? 30_000;
  const expireAfter = opts.expireAfter ?? staleAfter * 5;
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;

  if (entry?.inFlight) return entry.inFlight;

  if (entry && entry.data !== undefined && now - entry.fetchedAt < expireAfter) {
    if (now - entry.fetchedAt < staleAfter) return entry.data;
    revalidate(key, fetcher, staleAfter);
    return entry.data;
  }

  return fetchFresh(key, fetcher);
}

function fetchFresh<T>(key: string, fetcher: Fetcher<T>): Promise<T> {
  const entry: Entry<T> = {
    status: "empty",
    data: undefined,
    fetchedAt: Date.now(),
  };
  const p = fetcher()
    .then((data) => {
      entry.status = "fresh";
      entry.data = data;
      entry.fetchedAt = Date.now();
      return data;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    })
    .finally(() => {
      entry.inFlight = undefined;
    });
  entry.inFlight = p;
  store.set(key, entry as Entry<unknown>);
  return p;
}

function revalidate<T>(key: string, fetcher: Fetcher<T>, staleAfter: number): void {
  const entry = store.get(key) as Entry<T> | undefined;
  if (entry?.inFlight) return;
  const p = fetcher()
    .then((data) => {
      entry.status = "fresh";
      entry.data = data;
      entry.fetchedAt = Date.now();
      return data;
    })
    .catch(() => undefined)
    .finally(() => {
      if (entry) entry.inFlight = undefined;
    });
  if (entry) entry.inFlight = p;
  if (!entry) {
    store.set(key, {
      status: "stale",
      data: undefined,
      fetchedAt: Date.now(),
      inFlight: p,
    } as Entry<unknown>);
  }
  void staleAfter;
}

export function invalidate(key: string): void {
  store.delete(key);
}

export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
