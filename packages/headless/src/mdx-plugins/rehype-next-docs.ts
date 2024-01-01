import type { Element, Root } from 'hast';
import rehypePrettycode, {
  type Options as RehypePrettyCodeOptions,
} from 'rehype-pretty-code';
import type { Transformer } from 'unified';
import { visit } from './hast-utils';

interface MetaValue {
  name: string;
  regex: RegExp;
}

const metaKey = '__nd_meta';

/**
 * Custom meta string values
 */
const metaValues: MetaValue[] = [
  {
    name: 'title',
    regex: /title="(?<value>[^"]*)"/,
  },
  {
    name: 'caption',
    regex: /caption="(?<value>[^"]*)"/,
  },
  {
    name: 'custom',
    regex: /custom="(?<value>[^"]+)"/,
  },
];

const defaultCodeOptions: RehypePrettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultLang: {
    block: 'text',
  },
  grid: true,
  keepBackground: false,
  filterMetaString(s) {
    let replaced = s;
    for (const value of metaValues) {
      replaced = replaced.replace(value.regex, '');
    }

    return replaced;
  },
};

export interface RehypeNextDocsOptions {
  codeOptions?: RehypePrettyCodeOptions;
}

function getMetaFromCode(element: Element): string {
  if (element.data && 'meta' in element.data) {
    return element.data.meta as string;
  }

  return (element.properties.metastring ?? '') as string;
}

function parseMeta(meta: string): Record<string, string> {
  const map: Record<string, string> = {};

  for (const value of metaValues) {
    const result = value.regex.exec(meta);

    if (result?.groups) {
      map[value.name] = result.groups.value;
    }
  }

  return map;
}

/**
 * Handle codeblocks
 */
export function rehypeNextDocs({
  codeOptions,
}: RehypeNextDocsOptions = {}): Transformer<Root, Root> {
  // TODO: Migrate to rehype-shikiji
  return async (tree, vfile) => {
    visit(tree, ['pre'], (node) => {
      const codeElement = node.children[0] as Element;

      const meta = getMetaFromCode(codeElement);

      Object.assign(node, {
        [metaKey]: parseMeta(meta),
      });
    });

    const plugin = rehypePrettycode({
      ...defaultCodeOptions,
      ...codeOptions,
    }) as Transformer<Root, Root>;

    await plugin(tree, vfile, () => {
      // do nothing
    });

    visit(tree, ['figure', 'pre'], (node) => {
      // Remove figure wrapper
      if ('data-rehype-pretty-code-figure' in node.properties) {
        Object.assign(node, node.children[0]);
      }

      if (metaKey in node) {
        Object.assign(node.properties, node[metaKey]);
      }
    });
  };
}
