import {
  type DocumentNode,
  GraphQLDirective,
  type GraphQLDefaultInput,
  type GraphQLInputType,
  type GraphQLNamedType,
  Kind,
  parse,
  print,
  printDirective,
  printType,
  valueToLiteral,
  visit,
} from 'graphql';

/**
 * The SDL of a named type or directive, descriptions are omitted unless `descriptions` is set.
 *
 * Definitions are printed as written when the schema has their AST, which keeps custom directives like `@auth`.
 */
export function printDefinition(
  definition: GraphQLNamedType | GraphQLDirective,
  { descriptions = false }: { descriptions?: boolean } = {},
): string {
  let document: DocumentNode;
  if (definition.astNode) {
    const extensions = definition instanceof GraphQLDirective ? [] : definition.extensionASTNodes;
    document = { kind: Kind.DOCUMENT, definitions: [definition.astNode, ...extensions] };
  } else {
    document = parse(
      definition instanceof GraphQLDirective ? printDirective(definition) : printType(definition),
    );
  }
  if (descriptions) return print(document);

  return print(
    visit(document, {
      enter(node) {
        if ('description' in node && node.description) return { ...node, description: undefined };
      },
    }),
  );
}

/**
 * The default value of an argument or input field in GraphQL syntax, like `PENDING` or `{ first: 10 }`.
 */
export function printDefaultValue(
  defaultInput: GraphQLDefaultInput | undefined,
  type: GraphQLInputType,
): string | undefined {
  if (!defaultInput) return;
  if (defaultInput.literal) return print(defaultInput.literal);
  if (defaultInput.value === undefined) return;

  try {
    const node = valueToLiteral(defaultInput.value, type);
    if (node) return print(node);
  } catch {
    // fall through
  }

  return JSON.stringify(defaultInput.value);
}
