import type { Program } from 'estree';
import type { BlockContent, Code, DefinitionContent, Heading, Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remark } from 'remark';
import type {
  AttributeInterface,
  ClassInterface,
  DocstringSection,
  FunctionInterface,
  ModuleInterface,
  ParameterInterface,
} from './generated';
import type { PythonGroupBy, PythonPageKind } from './source';

type Flow = BlockContent | DefinitionContent;

export interface BuiltPage {
  /** virtual path, e.g. `httpx/_client/index.mdx` */
  path: string;
  title: string;
  kind: PythonPageKind;
  /** build the content, `href` resolves the URL of linked modules and classes */
  build: (href: (target: BuiltPage) => string) => Root;
}

const parser = remark()
  .use(remarkGfm)
  .use(function () {
    // docstrings are not HTML, keep `<` as text
    (this.data().micromarkExtensions ??= []).push({ disable: { null: ['htmlFlow', 'htmlText'] } });
  });

/** One page per module and class, a class page comes before its module. */
export function buildPages(root: ModuleInterface, groupBy: PythonGroupBy = 'module'): BuiltPage[] {
  const pages: BuiltPage[] = [];

  /** file path of an object, without extension */
  function file(path: string) {
    if (groupBy === 'none') path = path === root.path ? '' : path.slice(root.path.length + 1);
    return path.replaceAll('.', '/');
  }

  function classPage(cls: ClassInterface): BuiltPage {
    return {
      path: `${file(cls.path)}.mdx`,
      title: cls.name,
      kind: 'class',
      build() {
        const content = describe(cls.description, cls.docstring);

        if (cls.attributes.length > 0) {
          content.push(heading('Attributes'), attributes(cls.attributes));
        }

        // the constructor leads, it takes the place of a parameters section
        const functions = Object.values(cls.functions).sort(
          (a, b) => Number(isConstructor(b)) - Number(isConstructor(a)),
        );
        if (functions.length > 0) {
          content.push(heading('Functions'), ...functions.map(fn));
        }

        return { type: 'root', children: content };
      },
    };
  }

  function module(mod: ModuleInterface): BuiltPage {
    const classes = Object.values(mod.classes).map(classPage);
    pages.push(...classes);
    const modules = Object.values(mod.modules).map(module);

    const dir = file(mod.path);
    // only a module with child pages needs a folder
    const folder = classes.length > 0 || modules.length > 0;

    const page: BuiltPage = {
      path: !dir ? 'index.mdx' : folder ? `${dir}/index.mdx` : `${dir}.mdx`,
      title: mod.name,
      kind: 'module',
      build(href) {
        const content = describe(mod.description, mod.docstring);
        if (mod.attributes.length > 0) content.push(attributes(mod.attributes));

        const tabs: string[] = [];
        const panels: MdxJsxFlowElement[] = [];
        function tab(name: string, children: Flow[]) {
          tabs.push(name);
          panels.push(jsx('Tab', { value: name }, children));
        }

        if (classes.length > 0) tab('Class', [cards(classes, href)]);

        const functions = Object.values(mod.functions);
        if (functions.length > 0) tab('Functions', functions.map(fn));

        if (modules.length > 0) tab('Modules', [cards(modules, href)]);

        if (tabs.length > 0) content.push(jsx('Tabs', { items: tabs }, panels));

        return { type: 'root', children: content };
      },
    };

    pages.push(page);
    return page;
  }

  module(root);
  return pages;
}

function cards(targets: BuiltPage[], href: (target: BuiltPage) => string): MdxJsxFlowElement {
  return jsx(
    'Cards',
    {},
    targets.map((target) => jsx('Card', { title: target.title, href: href(target) })),
  );
}

function fn(func: FunctionInterface): MdxJsxFlowElement {
  const content = describe(func.description, func.docstring);

  if (func.source.length > 0) {
    content.push(jsx('PySourceCode', {}, [code('python', func.source)]));
  }
  if (func.parameters.length > 0) {
    content.push(jsx('div', {}, func.parameters.map(parameter)));
  }
  content.push(
    jsx(
      'PyFunctionReturn',
      { type: func.returns.annotation },
      func.returns.description ? markdown(func.returns.description) : [],
    ),
  );

  return jsx(
    'PyFunction',
    { name: func.name, type: func.signature, kind: isConstructor(func) ? 'constructor' : null },
    content,
  );
}

function isConstructor(func: FunctionInterface) {
  return func.name === '__init__';
}

function parameter(param: ParameterInterface): MdxJsxFlowElement {
  return jsx(
    'PyParameter',
    { name: param.name, type: param.annotation, value: param.value },
    typeof param.description === 'string'
      ? markdown(param.description)
      : docstring(param.description),
  );
}

function attributes(attrs: AttributeInterface[]): MdxJsxFlowElement {
  return jsx(
    'PyAttributes',
    {},
    attrs.map((attr) =>
      jsx(
        'PyAttribute',
        { name: attr.name, type: attr.annotation, value: attr.value },
        docstring(attr.description),
      ),
    ),
  );
}

function describe(description: string | null, sections: DocstringSection[] | null): Flow[] {
  const content = description ? markdown(description) : [];
  content.push(...docstring(sections));
  return content;
}

function docstring(sections: DocstringSection[] | null): Flow[] {
  const content: Flow[] = [];

  for (const section of sections ?? []) {
    if (section.kind === 'text') {
      content.push(...markdown(section.value));
    } else if (section.kind === 'admonition') {
      content.push(
        jsx(
          'Callout',
          { title: section.title, type: section.value.annotation },
          markdown(section.value.description),
        ),
      );
    } else if (section.kind === 'examples') {
      for (const [kind, value] of section.value) {
        if (kind === 'text') content.push(...markdown(value));
        else content.push(code('python', value));
      }
    }
  }

  return content;
}

function markdown(text: string): Flow[] {
  return parser.parse(text).children as Flow[];
}

function heading(text: string): Heading {
  return { type: 'heading', depth: 2, children: [{ type: 'text', value: text }] };
}

function code(lang: string, value: string): Code {
  return { type: 'code', lang, value };
}

function jsx(
  name: string,
  props: Record<string, string | string[] | null | undefined>,
  children: Flow[] = [],
): MdxJsxFlowElement {
  const attributes: MdxJsxAttribute[] = [];
  for (const name in props) {
    const value = props[name];
    if (value == null) continue;

    attributes.push({
      type: 'mdxJsxAttribute',
      name,
      value: typeof value === 'string' ? value : expression(value),
    });
  }

  return { type: 'mdxJsxFlowElement', name, attributes, children };
}

/** an array of strings as an attribute expression, with the estree the renderer evaluates */
function expression(value: string[]): MdxJsxAttribute['value'] {
  const estree: Program = {
    type: 'Program',
    sourceType: 'module',
    body: [
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'ArrayExpression',
          elements: value.map((item) => ({ type: 'Literal', value: item })),
        },
      },
    ],
  };

  return { type: 'mdxJsxAttributeValueExpression', value: JSON.stringify(value), data: { estree } };
}
