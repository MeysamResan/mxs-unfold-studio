import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../dist/wrangler.json', import.meta.url));
const configDirectory = dirname(configPath);
const config = JSON.parse(await readFile(configPath, 'utf8'));
if (!config.main || !config.assets?.directory) {
  throw new Error('The generated deployment config must include a Worker entry and public assets.');
}

const entry = resolve(configDirectory, config.main);
const moduleRoot = config.base_dir ? resolve(configDirectory, config.base_dir) : dirname(entry);
const assetRoot = resolve(configDirectory, config.assets.directory);

function contains(parent, child) {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

// Wrangler discovers extra modules below main's directory (or an explicit base_dir).
// Nested output directories would attach browser bundles to the Worker or expose server files.
if (contains(moduleRoot, assetRoot) || contains(assetRoot, moduleRoot)) {
  throw new Error(
    'Worker modules and public assets must use separate, non-overlapping directories.',
  );
}

const [entryStats, assetStats] = await Promise.all([stat(entry), stat(assetRoot)]);
if (!entryStats.isFile() || !assetStats.isDirectory()) {
  throw new Error('The generated Worker entry or public assets directory is missing.');
}

console.log('Worker module and public asset directories are separate.');
