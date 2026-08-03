import {
  buildASTSchema,
  extendSchema,
  type DefinitionNode,
  type GraphQLSchema,
  Kind,
  parse,
} from 'graphql';

/**
 * Build a `GraphQLSchema` from SDL, with support for type extensions (e.g. `extend type Query`).
 */
export function buildSchemaFromSDL(sdl: string): GraphQLSchema {
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

  return schema;
}
