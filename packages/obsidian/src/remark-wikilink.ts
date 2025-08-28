import type { Link, Root, Text } from 'mdast';
import path from 'node:path';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, VaultFile } from '@/index';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
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

  const target = path
    .join(path.dirname(file.path), content)
    .replaceAll('\\', '/');
  const ref =
    contentByName.get(target) ?? files.find((file) => file.path === target);
  if (!ref) return;

  return {
    type: 'link',
    url: `${target}.mdx`,
    children: [
      {
        type: 'text',
        value: content,
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

    visit(tree, 'text', (node) => {
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
