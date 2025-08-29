import type { Blockquote, PhrasingContent, Root, RootContent } from 'mdast';
import path from 'node:path';
import { Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { InternalContext, ParsedContentFile, ParsedFile } from '@/index';
import { slug } from 'github-slugger';
import { flattenNode } from '@/utils/flatten-node';
import { stash } from '@/utils/stash';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { separate } from '@/utils/mdast-separate';
import { createCallout } from '@/utils/mdast-create';

const RegexWikilink = /!?\[\[(?<content>([^\]]|\\])+)]]/g;
const RegexContent =
  /^(?<name>(?:\\#|\\\||[^#|])+)(?:#(?<heading>(?:\\\||[^|])+))?(?:\|(?<alias>.+))?$/;
const RegexCalloutHead = /^\[!(?<type>\w+)](?<collapsible>\+)?/;

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

  const { name, heading, alias } = match.groups as {
    name: string;
    heading?: string;
    alias?: string;
  };
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

  let href = stash(path.relative(dir, ref.outPath));
  if (!href.startsWith('../')) href = `./${href}`;
  if (heading) href = `${href}#${slug(heading)}`;

  return {
    type: 'link',
    url: href,
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

    if (file.format === 'content' && file.frontmatter?.aliases) {
      for (const alias of file.frontmatter.aliases) {
        context.byName.set(alias, file);
      }
    }
  }

  return (tree, file) => {
    const source = file.data.source;
    if (!source) return;

    visit(tree, ['text', 'heading', 'blockquote'], (node) => {
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
        if (callout) Object.assign(node, callout);

        return;
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
