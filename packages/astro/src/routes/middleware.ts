import type { MiddlewareHandler } from 'astro';
import { sequence } from 'astro:middleware';
import { app, requests } from '../app';

// for islands of content rendered without the props of providers
const handlers: MiddlewareHandler[] = [(context, next) => requests.run(context, next)];
for (const { middleware } of app.plugins) {
  if (middleware) handlers.push((context, next) => middleware.call(app, context, next));
}

/** the `middleware` of plugins, in order */
export const onRequest = sequence(...handlers);
