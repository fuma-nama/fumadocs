import {
  buildASTSchema,
  extendSchema,
  type DefinitionNode,
  type GraphQLSchema,
  Kind,
  parse,
} from 'graphql';

// schemas are immutable, pages of the same document share one
const cache = new Map<string, GraphQLSchema>();

/**
 * Build a `GraphQLSchema` from SDL, with support for type extensions (e.g. `extend type Query`).
 */
export function buildSchemaFromSDL(sdl: string): GraphQLSchema {
  const cached = cache.get(sdl);
  if (cached) return cached;

  const document = parse(sdl);
  const definitions: DefinitionNode[] = [];
  const extensions: DefinitionNode[] = [];

  for (const node of document.definitions) {
    if (node.kind.endsWith('Extension')) {
      extensions.push(node);
    } else {
      definitions.push(node);
    }
  }

  // skip schema validation on client, it is done on server when loading the schema.
  let schema = buildASTSchema(
    { kind: Kind.DOCUMENT, definitions },
    { assumeValidSDL: true, assumeValid: true },
  );
  if (extensions.length > 0) {
    schema = extendSchema(
      schema,
      { kind: Kind.DOCUMENT, definitions: extensions },
      { assumeValidSDL: true, assumeValid: true },
    );
  }

  // bound the cache, a page renders one schema at a time
  if (cache.size >= 4) cache.delete(cache.keys().next().value!);
  cache.set(sdl, schema);

  return schema;
}
