import { describe, expect, it, vi } from 'vitest';
import { ResourcePool } from './resource-pool';

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('resource lease ownership', () => {
  it('loads once and disposes only after the final idempotent release', async () => {
    const resource = {};
    const load = vi.fn(async () => resource);
    const dispose = vi.fn();
    const pool = new ResourcePool(load, dispose);
    const a = pool.acquire('a');
    const b = pool.acquire('a');
    expect(await a.promise).toBe(await b.promise);
    a.release();
    a.release();
    await flush();
    expect(dispose).not.toHaveBeenCalled();
    b.release();
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledExactlyOnceWith(resource);
  });
  it('reuses a pending lease across immediate React remounts', async () => {
    const pending = deferred<object>();
    const load = vi.fn(() => pending.promise);
    const pool = new ResourcePool(load, vi.fn());
    const first = pool.acquire('a');
    first.release();
    const second = pool.acquire('a');
    await flush();
    pending.resolve({});
    await second.promise;
    expect(load).toHaveBeenCalledTimes(1);
    second.release();
    await flush();
  });
  it('disposes a late decoder result without evicting its replacement', async () => {
    const old = deferred<object>();
    const current = deferred<object>();
    const dispose = vi.fn();
    const load = vi
      .fn()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => current.promise);
    const pool = new ResourcePool<object>(load, dispose);
    const first = pool.acquire('a');
    first.release();
    await flush();
    const second = pool.acquire('a');
    const staleResource = {};
    old.resolve(staleResource);
    await first.promise;
    await flush();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(staleResource);
    const newResource = {};
    current.resolve(newResource);
    expect(await second.promise).toBe(newResource);
    second.release();
    await flush();
    expect(dispose).toHaveBeenCalledTimes(2);
  });
  it('an old failed request cannot remove a newer request with the same URL', async () => {
    const old = deferred<object>();
    const load = vi
      .fn()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValue({});
    const pool = new ResourcePool<object>(load, vi.fn());
    const first = pool.acquire('a');
    const failure = first.promise.catch(() => undefined);
    first.release();
    await flush();
    const second = pool.acquire('a');
    old.reject(new Error('aborted'));
    await failure;
    const third = pool.acquire('a');
    expect(await second.promise).toBe(await third.promise);
    expect(load).toHaveBeenCalledTimes(2);
    second.release();
    third.release();
    await flush();
  });
});
