import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWikipediaArticle, type WikipediaArticle } from './wikipedia-content';

interface WikipediaResource<T> {
  name: string;
  endpoint: (article: WikipediaArticle) => string;
  decode: (value: unknown, article: WikipediaArticle) => T;
}

type ResourceState<T> =
  | { key: string; status: 'loading' | 'error'; data?: never }
  | { key: string; status: 'ready'; data: T };

type CachedResource =
  { status: 'ready'; data: unknown; expires: number } | { status: 'error'; expires: number };

const cache = new Map<string, CachedResource>();
const cacheLifetime = 5 * 60 * 1000;
const errorCooldown = 30_000;
const cacheLimit = 100;

function remember(key: string, value: CachedResource) {
  if (!cache.has(key) && cache.size >= cacheLimit) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
}

/** Independent article resources share the same bounded cache and request lifecycle. */
export function useWikipediaResource<T>(
  url: string,
  active: boolean,
  resource: WikipediaResource<T>,
) {
  const article = useMemo(() => getWikipediaArticle(url), [url]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ key: url, status: 'loading' });
  const attempted = useRef<string | null>(null);
  const retry = useCallback(() => {
    if (article) cache.delete(`${resource.name}:${article.url}`);
    setAttempt((value) => value + 1);
  }, [article, resource]);

  useEffect(() => {
    if (!active) return;
    if (!article) {
      setState({ key: url, status: 'error' });
      return;
    }
    const cacheKey = `${resource.name}:${article.url}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      setState(
        cached.status === 'ready'
          ? { key: url, status: 'ready', data: cached.data as T }
          : { key: url, status: 'error' },
      );
      return;
    }
    if (cached) cache.delete(cacheKey);
    const requestKey = `${cacheKey}:${attempt}`;
    if (attempted.current === requestKey) return;
    attempted.current = requestKey;
    const controller = new AbortController();
    let live = true;
    let settled = false;
    setState({ key: url, status: 'loading' });
    const timeout = window.setTimeout(() => {
      settled = true;
      controller.abort();
      if (live) {
        remember(cacheKey, { status: 'error', expires: Date.now() + errorCooldown });
        setState({ key: url, status: 'error' });
      }
    }, 10_000);

    void fetch(resource.endpoint(article), {
      signal: controller.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Wikipedia request failed');
        return resource.decode(await response.json(), article);
      })
      .then((data) => {
        if (!live || controller.signal.aborted) return;
        settled = true;
        attempted.current = null;
        remember(cacheKey, { status: 'ready', data, expires: Date.now() + cacheLifetime });
        setState({ key: url, status: 'ready', data });
      })
      .catch(() => {
        if (!live || controller.signal.aborted) return;
        settled = true;
        remember(cacheKey, { status: 'error', expires: Date.now() + errorCooldown });
        setState({ key: url, status: 'error' });
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      live = false;
      window.clearTimeout(timeout);
      controller.abort();
      if (!settled) attempted.current = null;
    };
  }, [active, article, attempt, resource, url]);

  return {
    article,
    state: state.key === url ? state : ({ key: url, status: 'loading' } as const),
    retry,
  };
}
