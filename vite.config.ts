import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare({ viteEnvironment: { name: 'worker' } })],
  environments: {
    // The plugin builds the Worker first, then the client. Keep the deployment
    // config at dist/wrangler.json and Worker module discovery inside dist/worker.
    worker: {
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rolldownOptions: {
          output: {
            entryFileNames: 'worker/[name].js',
            chunkFileNames: 'worker/[name]-[hash].js',
            assetFileNames: 'worker/[name]-[hash][extname]',
          },
        },
      },
    },
    client: { build: { outDir: 'dist/client' } },
  },
  build: { target: 'es2022', sourcemap: false },
});
