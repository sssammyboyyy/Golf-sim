import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import { nextOnPagesRoutes } from './_worker.js/next-on-pages-internal/routes-manifest.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await getAssetFromKV({
        request,
        waitUntil(promise) {
          return ctx.waitUntil(promise);
        },
      });
    } catch (e) {
      let pathname = new URL(request.url).pathname;
      if (nextOnPagesRoutes.some(route => pathname.startsWith(route.pattern))) {
        return (await import('./_worker.js')).default.fetch(request, env, ctx);
      }
      return new Response(e.message || e.toString(), { status: 500 });
    }
  }
};
