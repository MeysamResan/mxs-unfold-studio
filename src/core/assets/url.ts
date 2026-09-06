export function assetUrl(path: string, base = import.meta.env.VITE_ASSET_BASE_URL ?? ''): string {
  if (!path.startsWith('/media/') || path.includes('..'))
    throw new Error('Expected a versioned media path.');
  if (!base) return path;
  const origin = new URL(base);
  if (
    origin.protocol !== 'https:' &&
    !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))
  ) {
    throw new Error('Media must be served over HTTPS.');
  }
  if (origin.username || origin.password || origin.search || origin.hash)
    throw new Error('Asset URLs must not include credentials, queries, or fragments.');
  return `${base.replace(/\/$/, '')}${path}`;
}
