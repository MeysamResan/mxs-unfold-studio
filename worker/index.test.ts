import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

afterEach(() => vi.restoreAllMocks());

function assetEnvironment(fetch: ReturnType<typeof vi.fn>): Env {
  return { ASSETS: { fetch } } as unknown as Env;
}

describe('page request Worker', () => {
  it('returns the original streamed asset response with its status and headers', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = new Response('studio document', {
      status: 203,
      headers: { 'content-type': 'text/html', etag: '"asset-version"' },
    });
    const fetch = vi.fn().mockResolvedValue(response);
    const request: Parameters<typeof worker.fetch>[0] = new Request(
      'https://studio.example/?private=do-not-log',
      {
        headers: {
          'cf-connecting-ip': '192.0.2.1',
          authorization: 'Bearer private-token',
          referer: 'https://private.example/profile',
        },
      },
    );
    Object.defineProperty(request, 'cf', { value: { country: 'IQ' } });

    const result = await worker.fetch(request, assetEnvironment(fetch));

    expect(fetch).toHaveBeenCalledExactlyOnceWith(request);
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    expect(result.status).toBe(203);
    expect(result.headers.get('etag')).toBe('"asset-version"');
    expect(log).toHaveBeenCalledExactlyOnceWith({
      event: 'page_request',
      path: '/',
      method: 'GET',
      country: 'IQ',
      status: 203,
      duration_ms: expect.any(Number),
    });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toMatch(/private|studio\.example|192\.0\.2\.1|Bearer/);
    expect(await result.text()).toBe('studio document');
  });

  it('preserves an index.html redirect and reports an unknown country locally', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = new Response(null, { status: 307, headers: { location: '/' } });
    const fetch = vi.fn().mockResolvedValue(response);
    const result = await worker.fetch(
      new Request('https://studio.example/index.html', { method: 'HEAD' }),
      assetEnvironment(fetch),
    );

    expect(result).toBe(response);
    expect(result.headers.get('location')).toBe('/');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/index.html',
        method: 'HEAD',
        country: 'unknown',
        status: 307,
      }),
    );
  });

  it('passes fallback requests through without counting an asset miss as a page entry', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = new Response('missing', { status: 404 });
    const fetch = vi.fn().mockResolvedValue(response);
    const result = await worker.fetch(
      new Request('https://studio.example/media/missing.glb'),
      assetEnvironment(fetch),
    );

    expect(result).toBe(response);
    expect(log).not.toHaveBeenCalled();
  });

  it('keeps asset failures visible as invocation failures without logging error details', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const error = new Error('private upstream context');
    const fetch = vi.fn().mockRejectedValue(error);

    await expect(
      worker.fetch(new Request('https://studio.example/'), assetEnvironment(fetch)),
    ).rejects.toBe(error);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ event: 'page_request', status: 500 }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(error.message);
  });
});
