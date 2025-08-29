import type { Link, Root, Text } from 'mdast';
import path from 'node:path';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, ParsedContentFile, VaultFile } from '@/index';
import { slug } from 'github-slugger';
import { flattenNode } from '@/utils/flatten-node';
import { stash } from '@/utils/stash';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])+)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;

interface Context extends InternalContext {
  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byPath: Map<string, ParsedContentFile>;

  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byName: Map<string, ParsedContentFile>;
}

function resolveWikilink(
  isMedia: boolean,
  content: string,
  file: VaultFile,
  { byPath, byName }: Context,
): Link | undefined {
  if (isMedia) {
    console.warn('not implemented');
    return;
  }

  const match = RegexContent.exec(content);
  if (!match?.groups) return;

  const { name, heading, alias } = match.groups;
  const dir = path.dirname(file.path);
  let ref: ParsedContentFile | undefined;

  if (name.startsWith('./') || name.startsWith('../')) {
    const resolved = byPath.get(stash(path.join(dir, name)));

    if (resolved?.format === 'content') ref = resolved;
  } else {
    ref = // absolute path
      byPath.get(name) ??
      // basic
      byName.get(name);
  }

  if (!ref) {
    console.warn(`failed to resolve ${name} wikilink`);
    return;
  }

  let href = stash(path.relative(dir, ref.path));
  if (!href.startsWith('../')) href = `./${href}`;
  if (heading) href = `${href}#${slug(heading)}`;

  return {
    type: 'link',
    url: href,
    children: [
      {
        type: 'text',
        value: alias ?? ref.frontmatter.title ?? name,
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
    if (file.format !== 'content') continue;
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
      const child: (Link | Text)[] = [];
      let lastIndex = 0;
      let result: RegExpExecArray | null;

      while ((result = RegexWikilink.exec(text))) {
        if (!result.groups) break;
        const content = result.groups.content;
        const resolved = resolveWikilink(
          result[0].startsWith('!'),
          content,
          source,
          context,
        );
        if (!resolved) continue;

        if (lastIndex !== result.index - 1) {
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
