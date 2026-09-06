import { useEffect, useState } from 'react';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { modelAssets } from './model-assets';

type ModelResult =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; model: GLTF };

export function useModel(url: string, retry: number): ModelResult {
  const [result, setResult] = useState<ModelResult>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    const lease = modelAssets.acquire(url);
    setResult({ status: 'loading' });
    performance.mark('unfold:model-load-start');
    void lease.promise
      .then((model) => {
        if (!active) return;
        performance.mark('unfold:model-decoded');
        performance.measure('unfold:model-load', 'unfold:model-load-start', 'unfold:model-decoded');
        setResult({ status: 'ready', model });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load this model.',
          });
      });
    return () => {
      active = false;
      lease.release();
    };
  }, [url, retry]);
  return result;
}
