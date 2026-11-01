import type { MiddlewareHandler } from 'astro';
import { sequence } from 'astro:middleware';
import { app, getProviderData } from '../app';
import { requests } from '../mdx-runtime';

// for islands of content rendered without the props of providers
const handlers: MiddlewareHandler[] = [
  (context, next) => requests.run(() => getProviderData(context), next),
];
for (const { middleware } of app.plugins) {
  if (middleware) handlers.push((context, next) => middleware.call(app, context, next));
}

/** the `middleware` of plugins, in order */
export const onRequest = sequence(...handlers);
