import type { Blockquote, PhrasingContent, Root, RootContent } from 'mdast';
import path from 'node:path';
import { Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, ParsedContentFile, ParsedFile } from '@/convert';
import { flattenNode } from '@/utils/flatten-node';
import { stash } from '@/utils/stash';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { separate } from '@/utils/mdast-separate';
import { createCallout } from '@/utils/mdast-create';
import { replace } from '@/utils/mdast-replace';
import { slug } from 'github-slugger';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])*)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;
const RegexCalloutHead = /^\[!(?<type>\w+)](?<collapsible>\+)?/;

interface Context extends InternalContext {
  sourceFile: ParsedContentFile;

  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byPath: Map<string, ParsedFile>;

  /**
   * a file should create two item in this map, one with extension, and one without.
   */
  byName: Map<string, ParsedFile>;
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
  { byPath, byName, sourceFile }: Context,
): ParsedFile | undefined {
  const dir = path.dirname(sourceFile.path);

  if (pathname.startsWith('./') || pathname.startsWith('../')) {
    return byPath.get(stash(path.join(dir, pathname)));
  }

  // absolute path or basic
  return byPath.get(pathname) ?? byName.get(pathname);
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
                value: getFileHref(
                  path.dirname(context.sourceFile.outPath),
                  ref,
                  heading,
                ),
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
      url: ref.url,
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

    url = getFileHref(path.dirname(context.sourceFile.outPath), ref, heading);
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

function resolveCallout(this: Processor, node: Blockquote) {
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

export function remarkConvert(
  this: Processor,
  options: InternalContext,
): Transformer<Root, Root> {
  const byPath = new Map<string, ParsedFile>();
  const byName = new Map<string, ParsedFile>();

  for (const file of options.storage.values()) {
    const parsed = path.parse(file.path);

    byName.set(parsed.name, file);
    byPath.set(stash(path.join(parsed.dir, parsed.name)), file);

    byName.set(parsed.base, file);
    byPath.set(file.path, file);

    if (file.format === 'content' && file.frontmatter?.aliases) {
      for (const alias of file.frontmatter.aliases) {
        byName.set(alias, file);
      }
    }
  }

  return (tree, file) => {
    const source = file.data.source;
    if (!source) return;

    const context: Context = {
      ...options,
      sourceFile: source,
      byPath,
      byName,
    };

    visit(tree, ['text', 'heading', 'blockquote', 'link', 'image'], (node) => {
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
        const callout = resolveCallout.call(this, node);
        if (callout) replace(node, callout);

        return;
      }

      if (node.type === 'link' || node.type === 'image') {
        if (node.type === 'link' && node.data?.isWikiLink) return 'skip';

        const url = decodeURI(node.url);
        if (node.type === 'link' && url.startsWith('#')) {
          const heading = url.slice(1);
          node.url = `#${getHeadingHash(heading)}`;

          return 'skip';
        }

        const [ref, heading] = resolveInternalHref(url, context);
        if (!ref) return 'skip';

        node.url = getFileHref(path.dirname(source.outPath), ref, heading);
        return 'skip';
      }

      if (node.type !== 'text') return;

      const text = node.value;
      const child: RootContent[] = [];
      let lastIndex = 0;
      let result: RegExpExecArray | null;

      while ((result = RegexWikilink.exec(text))) {
        const resolved = resolveWikilink(
          result[0].startsWith('!'),
          result[1],
          context,
        );
        if (!resolved) continue;

        if (lastIndex < result.index) {
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

      replace(node, {
        type: 'root',
        children: child,
      } satisfies Root);
      return 'skip';
    });
  };
}

function getFileHref(dir: string, ref: ParsedFile, heading?: string) {
  if (ref.format === 'media') return ref.url;

  let url = stash(path.relative(dir, ref.outPath));
  if (!url.startsWith('../')) url = `./${url}`;
  if (heading) url += `#${getHeadingHash(heading)}`;

  return url;
}

function getHeadingHash(heading: string) {
  // for refs to block Ids, ignore slugify
  return heading.startsWith('^') ? heading : slug(heading);
}
