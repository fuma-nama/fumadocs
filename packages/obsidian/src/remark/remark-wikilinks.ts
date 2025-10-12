import { visit } from 'unist-util-visit';
import type {
  Paragraph,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast';
import type { Transformer } from 'unified';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { getFileHref, getHeadingHash } from '@/utils/get-refs';
import { ParsedFile } from '@/build-storage';
import { VaultResolver } from '@/build-resolver';

declare module 'mdast' {
  interface LinkData {
    isWikiLink?: boolean;
  }
}

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])*)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;

export interface RemarkWikilinksOptions {
  resolver: VaultResolver;
}

export function remarkWikilinks({
  resolver,
}: RemarkWikilinksOptions): Transformer<Root, Root> {
  return (tree, file) => {
    if (!file.data.source) return;
    const sourceFile = file.data.source;

    visit(tree, 'paragraph', (node, index, parent) => {
      if (typeof index !== 'number' || !parent) return;

      const replaceParagraph: RootContent[] = [node];
      let parents: Parent[] = [];

      function traverse(cur: RootContent) {
        if (cur.type === 'text') {
          const output = resolveParagraphText(cur.value, sourceFile, resolver);
          const idx = parents[0].children.indexOf(cur);
          let insertIdx = idx;

          parents[0].children.splice(insertIdx, 1);
          for (const item of output) {
            if (item.inParagraph) {
              parents[0].children.splice(insertIdx, 0, ...item.children);
              insertIdx += item.children.length;
            } else {
              replaceParagraph.push(...item.children);
              // clone parents
              parents = structuredClone(parents);
              // removed inserted elements
              parents[0].children.splice(idx, insertIdx - idx);
              insertIdx = idx;
              replaceParagraph.push(parents.at(-1) as Paragraph);
            }
          }

          return;
        }

        if ('children' in cur && Array.isArray(cur.children)) {
          parents.unshift(cur);
          for (const child of cur.children) {
            traverse(child);
          }
          parents.shift();
        }
      }

      traverse(node);
      parent.children.splice(index, 1, ...replaceParagraph);
    });
  };
}

type ResolveParagraphTextResult =
  | {
      inParagraph: true;
      children: PhrasingContent[];
    }
  | {
      inParagraph: false;
      children: RootContent[];
    };

function resolveParagraphText(
  text: string,
  sourceFile: ParsedFile,
  resolver: VaultResolver,
): ResolveParagraphTextResult[] {
  const output: ResolveParagraphTextResult[] = [];
  let concat: PhrasingContent[] = [];
  let lastIndex = 0;
  let result: RegExpExecArray | null;

  function flush() {
    if (concat.length === 0) return;

    output.push({
      inParagraph: true,
      children: concat,
    });
    concat = [];
  }

  while ((result = RegexWikilink.exec(text))) {
    const resolved = resolveWikilink(
      result[0].startsWith('!'),
      result[1],
      sourceFile,
      resolver,
    );
    if (!resolved) continue;
    if (lastIndex < result.index) {
      concat.push({
        type: 'text',
        value: text.substring(lastIndex, result.index),
      });
    }

    // for blocks, separate paragraphs
    if (resolved.type === 'mdxJsxFlowElement') {
      flush();
      output.push({
        inParagraph: false,
        children: [resolved],
      });
    } else {
      concat.push(resolved as PhrasingContent);
    }

    lastIndex = result.index + result[0].length;
  }

  if (lastIndex < text.length) {
    concat.push({
      type: 'text',
      value: text.substring(lastIndex),
    });
  }

  flush();
  return output;
}

function resolveWikilink(
  isEmbed: boolean,
  content: string,
  sourceFile: ParsedFile,
  resolver: VaultResolver,
): RootContent | undefined {
  const match = RegexContent.exec(content);
  if (!match?.groups) return;

  const { name, heading, alias } = match.groups as {
    name: string;
    heading?: string;
    alias?: string;
  };

  const isHeadingOnly = name.length === 0 && heading;

  if (isEmbed) {
    const ref = isHeadingOnly
      ? sourceFile
      : resolver.resolveAny(name, sourceFile.path);

    if (!ref) {
      console.warn(`failed to resolve ${name} wikilink`);
      return;
    }

    if (ref.format === 'content') {
      console.warn(
        'some features of embed content blocks are not supported yet, use at your own risk.',
      );

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
                value: getFileHref(ref, sourceFile, heading),
              },
            ],
          },
        ],
      } satisfies MdxJsxFlowElement;
    }

    if (alias)
      console.warn(
        'we do not support specifying image size like `![[image.png|300]].',
      );

    return {
      type: 'image',
      url: ref.url ?? getFileHref(ref, sourceFile, heading),
      alt: name,
    };
  }

  let url: string;

  if (isHeadingOnly) {
    url = `#${getHeadingHash(heading)}`;
  } else {
    const ref = resolver.resolveAny(name, sourceFile.path);

    if (!ref) {
      console.warn(`failed to resolve ${name} wikilink`);
      return;
    }

    url = getFileHref(ref, sourceFile, heading);
  }

  return {
    type: 'link',
    url,
    data: {
      isWikiLink: true,
    },
    children: [
      {
        type: 'text',
        value: alias ?? content,
      },
    ],
  };
}
