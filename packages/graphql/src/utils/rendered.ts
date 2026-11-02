// React Server Components render pages and server-render client components in separate module
// graphs, so the schemas of rendered pages are shared through `globalThis`
const key = Symbol.for('fumadocs-graphql.rendered-schemas');

/** the SDL of schemas left out of page props (`includeSchema: false`) for server rendering, by URL */
export function renderedSchemas(): Map<string, string> {
  const holder = globalThis as typeof globalThis & { [key]?: Map<string, string> };
  return (holder[key] ??= new Map());
}
