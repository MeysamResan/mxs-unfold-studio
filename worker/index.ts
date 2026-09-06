export default {
  async fetch(request, env): Promise<Response> {
    const path = new URL(request.url).pathname;
    const isPageEntry = path === '/' || path === '/index.html';

    // Asset misses can also reach this Worker. Only page entries get a custom log.
    if (!isPageEntry) return env.ASSETS.fetch(request);

    const startedAt = performance.now();
    let status = 500;
    try {
      const response = await env.ASSETS.fetch(request);
      status = response.status;
      // Return the asset response directly, preserving streaming, headers and status.
      return response;
    } finally {
      console.info({
        event: 'page_request',
        path,
        method: request.method,
        country: request.cf?.country ?? 'unknown',
        status,
        duration_ms: Math.round(performance.now() - startedAt),
      });
    }
  },
} satisfies ExportedHandler<Env>;
