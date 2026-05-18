// Builds a memoized fetcher: same key → same Promise → same result. Successes
// are cached for the SPA session; errors are NOT cached so a transient network
// blip doesn't permanently disable a lookup. Each failure simply rejects to the
// caller and the next call re-tries.

export type FetchResult<T> = T | { error: string };

export function createFetchCache<T>(
  loader: (key: string) => Promise<T>,
): (key: string) => Promise<FetchResult<T>> {
  const cache = new Map<string, T | Promise<FetchResult<T>>>();
  return (key: string) => {
    const existing = cache.get(key);
    if (existing) return Promise.resolve(existing as FetchResult<T>);
    const p: Promise<FetchResult<T>> = loader(key)
      .then((d) => {
        cache.set(key, d);
        return d as FetchResult<T>;
      })
      .catch((e: unknown) => {
        // Drop the in-flight promise from the cache so the next call retries.
        cache.delete(key);
        return { error: String(e) } as FetchResult<T>;
      });
    cache.set(key, p);
    return p;
  };
}
