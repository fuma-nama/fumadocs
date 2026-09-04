import {
  parseSync,
  type ArrayExpression,
  type JSXElement,
  type JSXOpeningElement,
  type Node,
  type ObjectExpression,
  type ObjectProperty,
  type Program,
} from 'oxc-parser';
import MagicString from 'magic-string';
import fs from 'node:fs/promises';

export type NodeOfType<T extends Node['type']> = Extract<Node, { type: T }>;

export interface SourceFile {
  path: string;
  /** the original content */
  code: string;
  program: Program;
  /** the edited content */
  s: MagicString;
  save(): Promise<void>;
}

export function parseSourceFile(path: string, code: string): SourceFile {
  const { program, errors } = parseSync(path, code);
  if (errors.length > 0) throw new Error(`Failed to parse ${path}: ${errors[0].message}`);
  const s = new MagicString(code);

  return {
    path,
    code,
    program,
    s,
    save: () => fs.writeFile(path, s.toString()),
  };
}

export async function createSourceFile(path: string): Promise<SourceFile> {
  return parseSourceFile(path, await fs.readFile(path, 'utf-8'));
}

export function getCodeValue(v: string) {
  return new Function(`return ${v}`)();
}

export function* descendants(node: Node): Generator<Node> {
  for (const key in node) {
    if (key === 'parent') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && 'type' in child) {
        yield child as Node;
        yield* descendants(child as Node);
      }
    }
  }
}

export function find<T extends Node['type']>(node: Node, type: T): NodeOfType<T> | undefined {
  for (const child of descendants(node)) {
    if (child.type === type) return child as NodeOfType<T>;
  }
}

export function findAll<T extends Node['type']>(node: Node, type: T): NodeOfType<T>[] {
  const out: NodeOfType<T>[] = [];
  for (const child of descendants(node)) {
    if (child.type === type) out.push(child as NodeOfType<T>);
  }
  return out;
}

export function findJsxElement(file: SourceFile, tagName: string): JSXElement | undefined {
  return findAll(file.program, 'JSXElement').find(({ openingElement: { name } }) => {
    return name.type === 'JSXIdentifier' && name.name === tagName;
  });
}

export function addJsxAttribute(file: SourceFile, element: JSXOpeningElement, attribute: string) {
  const { code, s } = file;
  const anchor = element.attributes.at(-1) ?? element.name;
  const multiline = code.slice(element.start, element.end).includes('\n');
  s.appendLeft(
    anchor.end,
    `${multiline ? `\n${lineIndent(code, anchor.start)}` : ' '}${attribute}`,
  );
}

/**
 * Insert JSX before the children of the element, re-indenting the children
 */
export function prependJsxChildren(file: SourceFile, element: JSXElement, jsx: string) {
  const { closingElement, openingElement } = element;
  if (!closingElement) return;
  const { code, s } = file;
  const indent = lineIndent(code, element.start);
  const prior = dedent(code.slice(openingElement.end, closingElement.start));
  const body = `${jsx}\n\n${prior}`.replaceAll(/^(?=.)/gm, `${indent}  `);
  s.overwrite(openingElement.end, closingElement.start, `\n${body}\n${indent}`);
}

/** trim, and remove the common indentation */
function dedent(text: string): string {
  const lines = text.trim().split('\n');
  let indent: string | undefined;
  for (const line of lines.slice(1)) {
    if (line.trim().length === 0) continue;
    const current = /^[ \t]*/.exec(line)![0];
    if (indent === undefined || current.length < indent.length) indent = current;
  }
  if (!indent) return lines.join('\n');
  return lines
    .map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n');
}

export function getProperty(object: ObjectExpression, name: string): ObjectProperty | undefined {
  for (const property of object.properties) {
    if (property.type !== 'Property') continue;
    const { key } = property;
    if (
      key.type === 'Identifier' ? key.name === name : key.type === 'Literal' && key.value === name
    )
      return property;
  }
}

/** indentation of the line containing `index` */
export function lineIndent(code: string, index: number): string {
  const start = code.lastIndexOf('\n', index - 1) + 1;
  return /^[ \t]*/.exec(code.slice(start, index))![0];
}

export function addImport(
  file: SourceFile,
  declaration: { from: string; default?: string; named?: string[] },
) {
  const parts: string[] = [];
  if (declaration.default) parts.push(declaration.default);
  if (declaration.named?.length) parts.push(`{ ${declaration.named.join(', ')} }`);
  const statement = `import ${parts.join(', ')} from '${declaration.from}';`;

  const last = file.program.body.findLast((node) => node.type === 'ImportDeclaration');
  if (last) file.s.appendLeft(last.end, `\n${statement}`);
  else file.s.prepend(`${statement}\n`);
}

type Container = ArrayExpression | ObjectExpression;
type ElementOf<C extends Container> = C extends ArrayExpression
  ? NonNullable<ArrayExpression['elements'][number]>
  : ObjectExpression['properties'][number];

function getElements<C extends Container>(container: C): ElementOf<C>[] {
  const elements = container.type === 'ArrayExpression' ? container.elements : container.properties;
  return elements.filter((element) => element !== null) as ElementOf<C>[];
}

/**
 * Append items to an array or object literal, following its formatting
 */
export function addElements(file: SourceFile, container: Container, items: string[]) {
  if (items.length === 0) return;
  const { code, s } = file;
  const last = getElements(container).at(-1);
  const multiline = code.slice(container.start, container.end).includes('\n');

  if (!last) {
    s.overwrite(container.start + 1, container.end - 1, items.join(', '));
    return;
  }

  if (!multiline) {
    s.appendLeft(last.end, items.map((item) => `, ${item}`).join(''));
    return;
  }

  const indent = lineIndent(code, last.start);
  s.appendLeft(
    last.end,
    items.map((item) => `,\n${indent}${item.replaceAll('\n', `\n${indent}`)}`).join(''),
  );
}

/**
 * Remove the items of an array or object literal that don't pass the filter
 */
export function filterElements<C extends Container>(
  file: SourceFile,
  container: C,
  keep: (element: ElementOf<C>) => boolean,
) {
  const { s } = file;
  const elements = getElements(container);
  const kept = elements.filter(keep);
  if (kept.length === elements.length) return;
  if (kept.length === 0) {
    s.remove(container.start + 1, container.end - 1);
    return;
  }

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (kept.includes(element)) continue;
    const next = elements[i + 1];
    // remove along with the separator: up to the next item, or from the last kept item
    if (next) s.remove(element.start, next.start);
    else s.remove(kept.at(-1)!.end, element.end);
  }
}
