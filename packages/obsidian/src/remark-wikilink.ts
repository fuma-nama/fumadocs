import type { Root, RootContent } from 'mdast';
import path from 'node:path';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, ParsedContentFile, ParsedFile } from '@/index';
import { slug } from 'github-slugger';
import { flattenNode } from '@/utils/flatten-node';
import { stash } from '@/utils/stash';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])+)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;

interface Context extends InternalContext {
  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byPath: Map<string, ParsedFile>;

  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byName: Map<string, ParsedFile>;
}

function resolveWikilink(
  isEmbed: boolean,
  content: string,
  file: ParsedContentFile,
  { byPath, byName }: Context,
): RootContent | undefined {
  const match = RegexContent.exec(content);
  if (!match?.groups) return;

  const { name, heading, alias } = match.groups;
  const dir = path.dirname(file.path);
  let ref: ParsedFile | undefined;

  if (name.startsWith('./') || name.startsWith('../')) {
    ref = byPath.get(stash(path.join(dir, name)));
  } else {
    // absolute path or basic
    ref = byPath.get(name) ?? byName.get(name);
  }

  if (!ref) {
    console.warn(`failed to resolve ${name} wikilink`);
    return;
  }

  if (isEmbed) {
    if (ref.format === 'content') {
      let filePath = stash(path.relative(dir, ref.outPath));
      if (heading) filePath = `${filePath}#${slug(heading)}`;

      return {
        type: 'mdxJsxFlowElement',
        name: 'include',
        attributes: [],
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                value: filePath,
              },
            ],
          },
        ],
      } satisfies MdxJsxFlowElement;
    }

    return {
      type: 'image',
      url: ref.url,
      alt: alias ?? name,
    };
  }

  let href = stash(path.relative(dir, ref.outPath));
  if (!href.startsWith('../')) href = `./${href}`;
  if (heading) href = `${href}#${slug(heading)}`;

  return {
    type: 'link',
    url: href,
    children: [
      {
        type: 'text',
        value:
          alias ??
          (ref.format === 'content' ? ref.frontmatter.title : null) ??
          name,
      },
    ],
  };
}

export function remarkWikiLink(
  options: InternalContext,
): Transformer<Root, Root> {
  const context: Context = {
    ...options,
    byPath: new Map(),
    byName: new Map(),
  };

  for (const file of options.storage.values()) {
    const parsed = path.parse(file.path);

    context.byName.set(parsed.name, file);
    context.byPath.set(stash(path.join(parsed.dir, parsed.name)), file);

    context.byName.set(parsed.base, file);
    context.byPath.set(file.path, file);
  }

  return (tree, file) => {
    const source = file.data.source;
    if (!source) return;

    visit(tree, ['text', 'heading'], (node) => {
      if (node.type === 'heading') {
        const text = flattenNode(node);

        // force the generated heading id for Fumadocs
        node.children.push({
          type: 'text',
          value: ` [#${slug(text)}]`,
        });
        return 'skip';
      }

      if (node.type !== 'text') return;

      const text = node.value;
      const child: RootContent[] = [];
      let lastIndex = 0;
      let result: RegExpExecArray | null;

      while ((result = RegexWikilink.exec(text))) {
        if (!result.groups) break;
        const resolved = resolveWikilink(
          result[0].startsWith('!'),
          result.groups.content,
          source,
          context,
        );
        if (!resolved) continue;

        if (lastIndex !== result.index) {
          child.push({
            type: 'text',
            value: text.substring(lastIndex, result.index),
          });
        }

        child.push(resolved);
        lastIndex = result.index + result[0].length;
      }

      if (lastIndex < text.length) {
        child.push({
          type: 'text',
          value: text.substring(lastIndex),
        });
      }

      Object.assign(node, {
        type: 'root',
        children: child,
        data: {},
      } satisfies Root);
      return 'skip';
    });
  };
}
