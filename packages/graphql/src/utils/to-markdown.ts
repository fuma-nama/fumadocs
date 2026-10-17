import {
  getNamedType,
  type GraphQLNamedType,
  type GraphQLSchema,
  isInterfaceType,
  isObjectType,
  isRequiredArgument,
  isSpecifiedScalarType,
} from 'graphql';
import type { GeneratedPageProps } from '@/utils/pages';
import { generateOperationExample, type OperationExample } from '@/utils/example';
import {
  type FieldRef,
  getOperationField,
  getOperationTitle,
  getRootType,
  getTypeUsages,
  getUnions,
  type OperationRef,
} from '@/utils/schema';
import { printDefaultValue, printDefinition, printFieldSignature } from '@/utils/sdl';

/**
 * The items of a page in Markdown, for LLMs.
 *
 * @param examples examples of the page's operations by `${kind}:${name}`, otherwise generated.
 */
export function toMarkdown(
  page: GeneratedPageProps,
  schema: GraphQLSchema,
  examples: Record<string, OperationExample[]> = {},
): string {
  // items have their own headings when the page shows titles
  const heading = page.showTitle ? '###' : '##';
  const out: string[] = [];
  // a page prints each type once, types with their own section on the page are printed there
  const printed = new Set<GraphQLNamedType>();
  for (const item of page.items ?? []) {
    const type = item.type === 'type' && schema.getType(item.name);
    if (type) printed.add(type);
  }
  // schema coordinates, like `Query.customer`
  const operationCoordinate = (ref: OperationRef) =>
    `${getRootType(schema, ref.kind)!.name}.${ref.name}`;
  const fieldCoordinate = (ref: FieldRef) => `${ref.parent}.${ref.field}`;

  for (const item of page.items ?? []) {
    if (item.type === 'type') {
      const type = schema.getType(item.name);
      if (!type) continue;

      // the SDL carries the description
      if (page.showTitle) out.push(`## ${type.name}`);
      out.push(codeBlock('graphql', printDefinition(type, { descriptions: true })));

      const usages = getTypeUsages(schema, type.name);
      let lines = '';
      const usage = (label: string, names: string) => {
        if (names) lines += `${lines && '\n'}- ${label}: ${names}`;
      };
      usage('Returned by', inlineCode(usages.returnedBy, operationCoordinate));
      usage('Input for', inlineCode(usages.inputFor, operationCoordinate));
      usage('Field of', inlineCode(usages.memberOf, fieldCoordinate));
      usage('Argument of', inlineCode(usages.argumentOf, fieldCoordinate));
      if (isInterfaceType(type)) {
        usage(
          'Implemented by',
          inlineCode(schema.getImplementations(type).objects, (o) => o.name),
        );
      }
      if (isObjectType(type)) {
        usage(
          'Member of',
          inlineCode(getUnions(schema, type), (u) => u.name),
        );
      }
      if (lines) out.push(lines);
      continue;
    }

    const field = getOperationField(schema, item.kind, item.name);
    if (!field) continue;

    if (page.showTitle) out.push(`## ${getOperationTitle(field.name)}`);
    if (page.showDescription && field.description) out.push(field.description);
    if (field.deprecationReason != null) out.push(`Deprecated: ${field.deprecationReason}`);
    out.push(
      codeBlock(
        'graphql',
        `type ${getRootType(schema, item.kind)!.name} {\n  ${printFieldSignature(field)}\n}`,
      ),
    );

    let lines = '';
    for (const arg of field.args) {
      let notes = `\`${arg.type}\``;
      if (isRequiredArgument(arg)) notes += ', required';
      const value = printDefaultValue(arg.default, arg.type);
      if (value !== undefined) notes += `, default \`${value}\``;

      let text = arg.description ?? '';
      if (arg.deprecationReason != null) {
        // sentences after a description without its own period run into it
        if (text && !/[.!?]$/.test(text)) text += '.';
        text += `${text && ' '}Deprecated: ${arg.deprecationReason}`;
      }
      lines += `${lines && '\n'}- \`${arg.name}\` (${notes})${text && `: ${text}`}`;
    }
    if (lines) out.push(`${heading} Arguments`, lines);

    const returnType = getNamedType(field.type);
    // built-in scalars describe GraphQL itself
    const description = isSpecifiedScalarType(returnType) ? undefined : returnType.description;
    out.push(`${heading} Returns`, `\`${field.type}\`${description ? `: ${description}` : ''}`);

    // the types it uses directly: the return type and argument types
    let sdl = '';
    const addType = (type: GraphQLNamedType) => {
      if (printed.has(type) || isSpecifiedScalarType(type)) return;
      printed.add(type);
      sdl += `${sdl && '\n\n'}${printDefinition(type, { descriptions: true })}`;
    };
    addType(returnType);
    for (const arg of field.args) addType(getNamedType(arg.type));
    if (sdl) out.push(`${heading} Types`, codeBlock('graphql', sdl));

    let list = examples[`${item.kind}:${item.name}`];
    if (!list) {
      const generated = generateOperationExample(schema, item);
      list = generated ? [generated] : [];
    }
    if (list.length > 0) out.push(`${heading} ${list.length > 1 ? 'Examples' : 'Example'}`);
    for (const example of list) {
      if (example.name) out.push(`${heading}# ${example.name}`);
      if (example.description) out.push(example.description);
      out.push(codeBlock('graphql', example.query));
      if (example.variables) out.push('Variables:', codeBlock('json', example.variables));
      out.push('Response:', codeBlock('json', example.response));
    }
  }

  return out.join('\n\n');
}

function inlineCode<T>(items: readonly T[], toText: (item: T) => string): string {
  let out = '';
  for (const item of items) out += `${out && ', '}\`${toText(item)}\``;
  return out;
}

function codeBlock(lang: string, code: unknown): string {
  const text = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
  // the fence outlasts backtick runs of the content, like fences in descriptions
  let fence = '```';
  for (const [run] of text.matchAll(/`{3,}/g)) if (run.length >= fence.length) fence = `${run}\``;
  return `${fence}${lang}\n${text}\n${fence}`;
}
