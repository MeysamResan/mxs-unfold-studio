import { readFile, readdir, stat } from 'node:fs/promises';
const base = process.env.VITE_ASSET_BASE_URL;
if (!base) {
  console.log('Using the bundled local media export.');
} else {
  const origin = new URL(base);
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      'The production media URL must be a public HTTPS origin without credentials, query, or fragment.',
    );
  }
  const manifest = JSON.parse(await readFile('src/content/asset-manifest.json', 'utf8'));
  // Validate every packaged media file, including collection thumbnails.
  const releasedAssets = new Map(Object.values(manifest).map((asset) => [asset.path, asset]));
  async function collectMedia(directory, prefix = '/media') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = new URL(
        `${encodeURIComponent(entry.name)}${entry.isDirectory() ? '/' : ''}`,
        directory,
      );
      const path = `${prefix}/${encodeURIComponent(entry.name)}`;
      if (entry.isDirectory()) await collectMedia(file, path);
      else if (entry.isFile() && !releasedAssets.has(path)) {
        releasedAssets.set(path, { path, bytes: (await stat(file)).size });
      }
    }
  }
  await collectMedia(new URL('../public/media/', import.meta.url));
  for (const asset of releasedAssets.values()) {
    const response = await fetch(`${base.replace(/\/$/, '')}${asset.path}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Missing released media: ${asset.path} (${response.status})`);
    const bytes = response.headers.get('content-length');
    if (bytes !== null && Number(bytes) !== asset.bytes)
      throw new Error(`Media size does not match the manifest: ${asset.path}`);
  }
  console.log('Versioned media files are available.');
}
