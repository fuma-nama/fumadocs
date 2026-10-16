import { readdir, readFile } from 'node:fs/promises';
import { Hono, type Context } from 'hono';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { assetsPath, buildSite, clientDir, normalizeBaseUrl, type SiteBuild } from './build';
import { createRenderer, type Render } from './render';
import type { Options } from './index';

export interface AppOptions extends Options {
  /**
   * Serve a CORS proxy for the API playground, it only forwards requests to the absolute URLs in `servers` of the documents.
   */
  proxy?: boolean;
}

const immutable = 'public, max-age=31536000, immutable';
const contentTypes: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
};

/**
 * Create a Hono app serving the docs under `baseUrl`, pages are rendered on request.
 */
export function createApp({ proxy = false, ...options }: AppOptions): Hono {
  const base = normalizeBaseUrl(options.baseUrl);
  const prefix = `${base}/${assetsPath}`;
  const app = new Hono();
  let site: Promise<SiteBuild & { render: Render }> | undefined;
  let assets: Promise<Set<string>> | undefined;

  function getSite() {
    return (site ??= buildSite(proxy ? { ...options, proxyUrl: `${prefix}/proxy` } : options)
      .then((build) => ({ ...build, render: createRenderer(build.renderInput) }))
      .catch((error: unknown) => {
        site = undefined;
        throw error;
      }));
  }

  if (proxy) {
    const { createProxy } = createOpenAPI();

    // the request's own origin comes from its `Host` header, which clients can forge
    app.all(`${prefix}/proxy`, async (c) =>
      createProxy({ allowedOrigins: (await getSite()).origins }).handle(c.req.raw),
    );
  }

  app.get(`${prefix}/assets/:file`, async (c) => {
    const file = c.req.param('file');
    assets ??= readdir(new URL('assets', clientDir)).then((files) => new Set(files));
    if (!(await assets).has(file)) return c.notFound();

    return c.body(await readFile(new URL(`assets/${file}`, clientDir)), 200, {
      'content-type':
        contentTypes[file.slice(file.lastIndexOf('.') + 1)] ?? 'application/octet-stream',
      'cache-control': immutable,
    });
  });

  app.get(`${prefix}/:file`, async (c) => {
    const content = (await getSite()).files.get(`${assetsPath}/${c.req.param('file')}`);
    if (content === undefined) return c.notFound();

    return c.body(content, 200, { 'content-type': 'application/json', 'cache-control': immutable });
  });

  async function render(c: Context) {
    const { status, html } = await (await getSite()).render(c.req.path);
    return c.html(html, status);
  }

  if (base) app.get(base, render);
  app.get(`${base}/*`, render);
  return app;
}
