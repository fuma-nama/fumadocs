import {
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  GraphQLError,
  type GraphQLSchema,
  Kind,
  type OperationDefinitionNode,
  parse,
  print,
  type SelectionSetNode,
  Source,
  TokenKind,
  validate,
} from 'graphql';
import { type LoadedSchema, readGraphQL } from '@/utils/load-schema';
import { collectFields, createOperationExample, type OperationExample } from '@/utils/example';
import { getOperationTitle, getRootType } from '@/utils/schema';

/** examples by `${kind}:${name}` of the root fields they select */
export type OperationExamples = Record<string, OperationExample[]>;

interface ExampleDocument {
  /** the file path or URL, names the document in errors */
  name: string;
  document: DocumentNode;
}

/**
 * Load the named operations of GraphQL documents as examples of the root fields they select, by
 * schema id. A record maps schema ids to their documents, an array applies to every schema.
 */
export async function loadExamples(
  input: string[] | Record<string, string[]>,
  schemas: Record<string, LoadedSchema>,
): Promise<Record<string, OperationExamples>> {
  const out: Record<string, OperationExamples> = {};
  for (const id in schemas) out[id] = {};

  function add({ name, document }: ExampleDocument, ids: string[]) {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.set(definition.name.value, definition);
      }
    }

    for (const operation of document.definitions) {
      if (operation.kind !== Kind.OPERATION_DEFINITION) continue;
      if (!operation.name) fail(name, 'Example operations must be named.', operation);

      const used = getUsedFragments(operation.selectionSet, fragments, []);
      const executable: DocumentNode = { kind: Kind.DOCUMENT, definitions: [operation, ...used] };
      const title = getOperationTitle(operation.name.value);
      const description = getDescription(operation);
      let errors = '';
      let matched = false;

      // an example belongs to the schemas it is valid in
      for (const id of ids) {
        const { schema } = schemas[id];
        const validation = validate(schema, executable);
        const { keys, errors: result } =
          validation.length > 0
            ? { keys: [], errors: validation }
            : getRootFields(schema, operation, used);
        if (result.length > 0) {
          errors += `${errors && '\n\n'}In schema "${id}":\n\n${result.join('\n\n')}`;
          continue;
        }

        if (keys.length === 0) continue;
        matched = true;
        const example: OperationExample = {
          name: title,
          description,
          ...createOperationExample(schema, operation, used),
        };
        for (const key of keys) (out[id][key] ??= []).push(example);
      }

      if (matched) continue;
      if (errors) throw invalid(name, errors);
      fail(
        name,
        `"${operation.name.value}" selects no root field of the listed schemas.`,
        operation,
      );
    }
  }

  if (Array.isArray(input)) {
    const ids = Object.keys(schemas);
    for (const document of await Promise.all(input.map(loadDocument))) add(document, ids);
  } else {
    await Promise.all(
      Object.entries(input).map(async ([id, items]) => {
        if (!Object.hasOwn(schemas, id)) {
          throw new Error(
            `[Fumadocs GraphQL] the schema "${id}" of "examples" is not listed in "input".`,
          );
        }

        for (const document of await Promise.all(items.map(loadDocument))) add(document, [id]);
      }),
    );
  }

  return out;
}

async function loadDocument(input: string): Promise<ExampleDocument> {
  const text = await readGraphQL(input);
  // documents read from files and URLs are named by them
  const name = text === input ? 'GraphQL text' : input;

  try {
    return { name, document: parse(new Source(text, name)) };
  } catch (error) {
    throw invalid(name, String(error));
  }
}

function getUsedFragments(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  out: FragmentDefinitionNode[],
): FragmentDefinitionNode[] {
  for (const selection of selectionSet.selections) {
    if (selection.kind !== Kind.FRAGMENT_SPREAD) {
      if (selection.selectionSet) getUsedFragments(selection.selectionSet, fragments, out);
      continue;
    }

    const fragment = fragments.get(selection.name.value);
    if (!fragment || out.includes(fragment)) continue;
    out.push(fragment);
    getUsedFragments(fragment.selectionSet, fragments, out);
  }

  return out;
}

/**
 * The `${kind}:${name}` of root fields a valid operation selects, and errors of their arguments not
 * passed as the variables of their names, which the playground edits them as.
 */
function getRootFields(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: readonly FragmentDefinitionNode[],
): { keys: string[]; errors: GraphQLError[] } {
  const root = getRootType(schema, operation.operation)!;
  const fields = new Map<string, FieldNode[]>();
  collectFields(schema, root, operation.selectionSet, fragments, fields);

  const keys: string[] = [];
  const errors: GraphQLError[] = [];
  for (const nodes of fields.values()) {
    const name = nodes[0].name.value;
    if (!root.getFields()[name]) continue;
    const key = `${operation.operation}:${name}`;
    if (!keys.includes(key)) keys.push(key);

    for (const node of nodes) {
      for (const arg of node.arguments ?? []) {
        const { value } = arg;
        if (value.kind === Kind.VARIABLE && value.name.value === arg.name.value) continue;
        errors.push(
          new GraphQLError(
            `"${operation.name?.value}" passes ${print(value)} to "${arg.name.value}" of ${root.name}.${name}, use $${arg.name.value} so the playground can edit it.`,
            { nodes: arg },
          ),
        );
      }
    }
  }

  return { keys, errors };
}

/** the description of an operation, otherwise the `#` comment lines right above it, as Markdown */
function getDescription(operation: OperationDefinitionNode): string | undefined {
  if (operation.description) return operation.description.value || undefined;

  let below = operation.loc!.startToken;
  let token = below.prev;
  let description = '';

  // a comment after code belongs to the code of its line
  while (
    token?.kind === TokenKind.COMMENT &&
    token.line === below.line - 1 &&
    token.prev!.line < token.line
  ) {
    const line = token.value.startsWith(' ') ? token.value.slice(1) : token.value;
    description = `${line}\n${description}`;
    below = token;
    token = token.prev;
  }

  return description.trim() || undefined;
}

function fail(name: string, message: string, node: OperationDefinitionNode): never {
  throw invalid(name, String(new GraphQLError(message, { nodes: node })));
}

function invalid(name: string, details: string): Error {
  return new Error(`[Fumadocs GraphQL] invalid example in ${name}:\n\n${details}`);
}
