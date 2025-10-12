import type {
  Blockquote,
  Paragraph,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast';
import path from 'node:path';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { flattenNode } from '@/utils/flatten-node';
import { stash } from '@/utils/stash';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { separate } from '@/utils/mdast-separate';
import { createCallout } from '@/utils/mdast-create';
import { slug } from 'github-slugger';
import type {
  ParsedContentFile,
  ParsedFile,
  VaultStorage,
} from '@/build-storage';
import type { VaultResolver } from '@/build-resolver';
import { replace } from '@/utils/mdast-replace';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])*)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;
const RegexCalloutHead = /^\[!(?<type>\w+)](?<collapsible>\+)?/;

export interface RemarkConvertOptions {
  storage: VaultStorage;
  resolver: VaultResolver;
}

interface Context extends RemarkConvertOptions {
  sourceFile: ParsedContentFile;
}

declare module 'mdast' {
  interface LinkData {
    isWikiLink?: boolean;
  }
}

function resolveInternalHref(
  href: string,
  ctx: Context,
): [ParsedFile | undefined, hash: string | undefined] {
  const [name, hash] = href.split('#', 2);
  return [resolveInternalPath(name, ctx), hash];
}

function resolveInternalPath(
  pathname: string,
  { resolver, sourceFile }: Context,
): ParsedFile | undefined {
  const dir = path.dirname(sourceFile.path);

  if (pathname.startsWith('./') || pathname.startsWith('../')) {
    return resolver.resolvePath(stash(path.join(dir, pathname)));
  }

  // absolute path or name
  return resolver.resolvePath(pathname) ?? resolver.resolveName(pathname);
}

function resolveWikilink(
  isEmbed: boolean,
  content: string,
  context: Context,
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
      ? context.sourceFile
      : resolveInternalPath(name, context);

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
                value: getFileHref(ref, context, heading),
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
      url: ref.url ?? getFileHref(ref, context, heading),
      alt: name,
    };
  }

  let url: string;

  if (isHeadingOnly) {
    url = `#${getHeadingHash(heading)}`;
  } else {
    const ref = resolveInternalPath(name, context);

    if (!ref) {
      console.warn(`failed to resolve ${name} wikilink`);
      return;
    }

    url = getFileHref(ref, context, heading);
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

function resolveCallout(node: Blockquote) {
  const head = node.children[0];
  if (!head || head.type !== 'paragraph') return;
  const textNode = head.children[0];
  if (!textNode || textNode.type !== 'text') return;

  const match = RegexCalloutHead.exec(textNode.value);
  if (!match) return;

  textNode.value = textNode.value.slice(match[0].length).trimStart();

  const [title, rest] = separate(/\r?\n/, head.children) ?? [head.children];
  const body = node.children.slice(1);
  if (rest) {
    body.unshift({
      type: 'paragraph',
      children: rest as PhrasingContent[],
    });
  }

  return createCallout(
    match[1],
    [
      {
        type: 'paragraph',
        children: title as PhrasingContent[],
      },
    ],
    body,
  );
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
  context: Context,
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
      context,
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

export function remarkConvert({
  storage,
  resolver,
}: RemarkConvertOptions): Transformer<Root, Root> {
  return (tree, file) => {
    const sourceFile = file.data.source;
    if (!sourceFile) return;

    const context: Context = {
      resolver,
      storage,
      sourceFile,
    };

    visit(tree, 'paragraph', (node, index, parent) => {
      if (typeof index !== 'number' || !parent) return;

      const replaceParagraph: RootContent[] = [node];
      let parents: Parent[] = [];

      function traverse(cur: RootContent) {
        if (cur.type === 'text') {
          const output = resolveParagraphText(cur.value, context);
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

    visit(tree, ['heading', 'blockquote', 'link', 'image'], (node) => {
      if (node.type === 'heading') {
        const text = flattenNode(node);

        // force the generated heading id for Fumadocs
        node.children.push({
          type: 'text',
          value: ` [#${slug(text)}]`,
        });
        return 'skip';
      }

      if (node.type === 'blockquote') {
        const callout = resolveCallout(node);
        if (callout) replace(node, callout);

        return;
      }

      if (node.type === 'link' || node.type === 'image') {
        if (node.type === 'link' && node.data?.isWikiLink) return 'skip';

        const url = decodeURI(node.url);
        if (node.type === 'link' && url.startsWith('#')) {
          const heading = url.slice(1);
          node.url = `#${getHeadingHash(heading)}`;
        } else {
          const [ref, heading] = resolveInternalHref(url, context);
          if (!ref) return 'skip';

          node.url = getFileHref(ref, context, heading);
        }

        return 'skip';
      }
    });
  };
}

function getFileHref(ref: ParsedFile, context: Context, heading?: string) {
  if (ref.format === 'media' && ref.url) return ref.url;

  const dir = path.dirname(context.sourceFile.outPath);
  let url = stash(path.relative(dir, ref.outPath));
  if (!url.startsWith('../')) url = `./${url}`;
  if (heading) url += `#${getHeadingHash(heading)}`;

  return url;
}

function getHeadingHash(heading: string) {
  // for refs to block Ids, ignore slugify
  return heading.startsWith('^') ? heading : slug(heading);
}
