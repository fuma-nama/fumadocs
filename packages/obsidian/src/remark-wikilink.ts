import type { Link, Root, Text } from 'mdast';
import path from 'node:path';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, VaultFile } from '@/index';
import matter from 'gray-matter';
import { slug } from 'github-slugger';
import { flattenNode } from '@/utils/flatten-node';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])+)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;

function resolveWikilink(
  isMedia: boolean,
  content: string,
  file: VaultFile,
  { contentByName, files }: InternalContext,
): Link | undefined {
  if (isMedia) {
    console.warn('not implemented');
    return;
  }

  const match = RegexContent.exec(content);
  if (!match?.groups) return;
  const { name, heading, alias } = match.groups;

  const target = path.join(path.dirname(file.path), name).replaceAll('\\', '/');

  const ref =
    contentByName.get(target) ?? files.find((file) => file.path === target);
  if (!ref) return;

  const hrefPath = target.startsWith('../')
    ? `${target}.mdx`
    : `./${target}.mdx`;

  return {
    type: 'link',
    url: heading ? `${hrefPath}#${slug(heading)}` : hrefPath,
    children: [
      {
        type: 'text',
        value: alias ?? matter(ref.content.toString()).data.title ?? name,
      },
    ],
  };
}

export function remarkWikiLink(
  context: InternalContext,
): Transformer<Root, Root> {
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
