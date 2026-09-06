import { expect, it } from 'vitest';
import { assetUrl } from './url';

it('resolves bundled and versioned remote assets', () => {
  expect(assetUrl('/media/models/test-123.glb', '')).toBe('/media/models/test-123.glb');
  expect(assetUrl('/media/models/test-123.glb', 'https://assets.example.com/')).toBe(
    'https://assets.example.com/media/models/test-123.glb',
  );
});
it('rejects traversal, insecure remote delivery and credentials', () => {
  expect(() => assetUrl('/media/../private', '')).toThrow();
  expect(() => assetUrl('/media/a.glb', 'http://example.com')).toThrow();
  expect(() => assetUrl('/media/a.glb', 'https://user:password@example.com')).toThrow();
});
