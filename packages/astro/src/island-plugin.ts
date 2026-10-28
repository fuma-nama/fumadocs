import type { Element } from 'hast';
import type {
  HastNode,
  HastPluginDefinition,
  MdxJsxFlowElementHast,
  MdxJsxTextElementHast,
} from 'satteri';
import type { Program } from 'estree-jsx';
import { parse } from 'yuku-parser';

const islandName = '_FumadocsIsland';
/** the replacer of `JSON.stringify()`, functions would be lost */
const serializeProps = `(key, value) => {
  if (typeof value === 'function') throw new Error(\`The props of MDX components must be serializable, "\${key}" is a function.\`);
  return value;
}`;

type JsxElement = MdxJsxFlowElementHast | MdxJsxTextElementHast;

/**
 * Render the MDX body as one React island: components share context and hydrate. Astro renders
 * the parts React can't (code content, images, imported components, expressions) into slots.
 *
 * The tree is serialized as {@link import('./shared').IslandNode}, evaluated by the MDX module.
 *
 * @param module - the module exporting `FumadocsIsland` of the collection
 */
export function islandPlugin(module: string): HastPluginDefinition {
  // names declared by the ESM of document, rendered by Astro
  const locals = new Set<string>();

  return {
    name: 'fumadocs-astro-island',
    mdxjsEsm(node) {
      const program = node.parseExpression();
      if (program) collectLocals(program, locals);
    },
    after(root, ctx) {
      const body: HastNode[] = [];
      for (const node of root.children) {
        if (node.type !== 'mdxjsEsm') body.push(node);
      }
      const { tree, slots } = serialize(body, locals);
      if (tree === '') return;

      ctx.appendChild(root, {
        type: 'mdxJsxFlowElement',
        name: islandName,
        attributes: [
          { type: 'mdxJsxAttribute', name: 'client:load', value: null },
          {
            type: 'mdxJsxAttribute',
            name: 'tree',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: `JSON.stringify([${tree}], ${serializeProps})`,
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'props',
            // like MDX, `wrapper` receives the props of content
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: '(({ components: _, children: __, ...rest }) => rest)(props)',
            },
          },
        ],
        children: slots,
      });
      for (const node of body) ctx.removeNode(node);
      ctx.prependChild(root, {
        type: 'mdxjsEsm',
        value: `import { FumadocsIsland as ${islandName} } from ${JSON.stringify(module)};`,
      });
    },
  };
}

function serialize(nodes: HastNode[], locals: Set<string>) {
  const slots: JsxElement[] = [];

  function slot(children: HastNode[]): string {
    const name = `s${slots.length}`;
    const copies: HastNode[] = [];
    // Sätteri treats a copy as a new node, unaffected by removing the original from the body
    for (const child of children) copies.push({ ...child });
    slots.push({
      type: 'mdxJsxFlowElement',
      name: 'Fragment',
      attributes: [{ type: 'mdxJsxAttribute', name: 'slot', value: name }],
      children: copies as JsxElement['children'],
    });
    return `{$slot:${JSON.stringify(name)}}`;
  }

  function list(children: HastNode[], pre = false): string {
    let out = '';
    for (const child of children) {
      // highlighted code is rendered once by Astro, rather than also being in the island props
      const code =
        pre && child.type === 'element' && child.tagName === 'code' && isStatic(child)
          ? element(child, `,${slot(child.children)}`)
          : node(child);
      if (code !== undefined) out += `,${code}`;
    }
    return out;
  }

  function node(node: HastNode): string | undefined {
    switch (node.type) {
      case 'text':
        return JSON.stringify(node.value);
      case 'element':
        // processed by the image pipeline of Astro
        if (node.tagName === 'img') return slot([node]);
        return element(node, list(node.children, node.tagName === 'pre'));
      case 'mdxJsxFlowElement':
      case 'mdxJsxTextElement': {
        const { name } = node;
        if (name === 'Fragment' || (name && locals.has(name.split('.')[0]))) return slot([node]);
        // HTML elements are converted like Markdown ones, for attributes like `class` and `style="..."`
        const properties = name && /^[a-z][^.]*$/.test(name) ? htmlProperties(node) : undefined;
        if (properties) return element({ tagName: name!, properties }, list(node.children));
        return `[1,${JSON.stringify(name)},${attributes(node)}${list(node.children)}]`;
      }
      case 'mdxFlowExpression':
      case 'mdxTextExpression':
        if (/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*$/.test(node.value)) return;
        if (node.value.includes('<'))
          assertLocalComponents(parse(`(${node.value})`, { lang: 'jsx' }).program, locals);
        return slot([node]);
    }
  }

  function element(element: Pick<Element, 'tagName' | 'properties'>, children: string): string {
    const properties =
      Object.keys(element.properties).length > 0 ? JSON.stringify(element.properties) : '0';
    return `[${JSON.stringify(element.tagName)},${properties}${children}]`;
  }

  function attributes(element: JsxElement): string {
    let out = '';
    for (const attribute of element.attributes) {
      if (attribute.type === 'mdxJsxExpressionAttribute') {
        out += `...(${expression(attribute.value.replace(/^\s*\.\.\./, ''))}),`;
        continue;
      }

      const key = JSON.stringify(attribute.name);
      if (attribute.value === null || attribute.value === undefined) out += `${key}:true,`;
      else if (typeof attribute.value === 'string')
        out += `${key}:${JSON.stringify(attribute.value)},`;
      else out += `${key}:(${expression(attribute.value.value)}),`;
    }
    return `{${out}}`;
  }

  /** move JSX in an expression into slots, the island receives their output */
  function expression(source: string): string {
    if (!source.includes('<')) return source;
    const code = `(${source})`;
    const { program } = parse(code, { lang: 'jsx' });
    assertLocalComponents(program, locals);
    const nodes: Span[] = [];
    collectJsx(program, nodes);

    nodes.sort((a, b) => a.start - b.start);
    let out = '';
    let last = 1;
    for (const { start, end } of nodes) {
      out += code.slice(last, start);
      out += slot([{ type: 'mdxFlowExpression', value: code.slice(start, end) }]);
      last = end;
    }
    return out + code.slice(last, -1);
  }

  let tree = '';
  for (const item of nodes) {
    if (item.type === 'text' && item.value.trim().length === 0) continue;
    const code = node(item);
    if (code !== undefined) tree += tree ? `,${code}` : code;
  }
  return { tree, slots };
}

/** the properties of an element with literal attributes only */
function htmlProperties(element: JsxElement): Element['properties'] | undefined {
  const properties: Element['properties'] = {};
  for (const attribute of element.attributes) {
    if (attribute.type !== 'mdxJsxAttribute') return;
    if (attribute.value !== null && typeof attribute.value === 'object') return;
    properties[attribute.name] = attribute.value ?? true;
  }
  return properties;
}

function isStatic(node: HastNode): boolean {
  if (node.type === 'text') return true;
  // elements named like components, e.g. the popups of Twoslash
  if (node.type !== 'element' || /^[A-Z]/.test(node.tagName)) return false;
  for (const child of node.children) if (!isStatic(child)) return false;
  return true;
}

interface Span {
  start: number;
  end: number;
}

/** JSX in expressions is rendered by Astro, which doesn't have the provided components */
function assertLocalComponents(node: unknown, locals: Set<string>) {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) {
    for (const item of node) assertLocalComponents(item, locals);
    return;
  }

  const { type, name } = node as { type?: string; name?: JsxName };
  if (type === 'JSXOpeningElement' && name) {
    let root = name;
    while (root.type === 'JSXMemberExpression') root = root.object;
    if (
      root.type === 'JSXIdentifier' &&
      (root !== name || /^[A-Z]/.test(root.name)) &&
      root.name !== 'Fragment' &&
      !locals.has(root.name)
    )
      throw new Error(
        `<${root.name}> in a JavaScript expression is rendered by Astro, outside of the content island. Use it outside of expressions, or import it in the MDX file.`,
      );
  }

  for (const key in node) {
    if (key !== 'loc') assertLocalComponents((node as Record<string, unknown>)[key], locals);
  }
}

type JsxName =
  | { type: 'JSXIdentifier'; name: string }
  | { type: 'JSXMemberExpression'; object: JsxName }
  | { type: 'JSXNamespacedName' };

/** outermost JSX, functions are skipped as their output isn't serializable anyway */
function collectJsx(node: unknown, out: Span[]) {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsx(item, out);
    return;
  }

  const { type } = node as { type?: string };
  if (type === 'JSXElement' || type === 'JSXFragment') {
    out.push(node as Span);
    return;
  }
  if (type === 'ArrowFunctionExpression' || type === 'FunctionExpression') return;

  for (const key in node) {
    if (key !== 'loc') collectJsx((node as Record<string, unknown>)[key], out);
  }
}

function collectLocals(program: Program, out: Set<string>) {
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers) out.add(specifier.local.name);
      continue;
    }

    if (statement.type !== 'ExportNamedDeclaration' || !statement.declaration) continue;
    const declaration = statement.declaration;
    if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === 'Identifier') out.add(declarator.id.name);
      }
    } else if (declaration.id) {
      out.add(declaration.id.name);
    }
  }
}
