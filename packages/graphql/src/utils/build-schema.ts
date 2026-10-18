import { buildSchema, type GraphQLSchema } from 'graphql';

// schemas are immutable, pages of the same document share one
const cache = new Map<string, GraphQLSchema>();

/**
 * Build a `GraphQLSchema` from SDL, type extensions (e.g. `extend type Query`) included.
 */
export function buildSchemaFromSDL(sdl: string): GraphQLSchema {
  const cached = cache.get(sdl);
  if (cached) return cached;

  // skip schema validation on client, it is done on server when loading the schema.
  // nothing reads the locations of schema nodes
  const schema = buildSchema(sdl, { assumeValidSDL: true, assumeValid: true, noLocation: true });

  // bound the cache, a page renders one schema at a time
  if (cache.size >= 4) cache.delete(cache.keys().next().value!);
  cache.set(sdl, schema);

  return schema;
}
