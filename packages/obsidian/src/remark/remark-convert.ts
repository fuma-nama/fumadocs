import type { Blockquote, PhrasingContent, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { separate } from '@/utils/mdast-separate';
import { createCallout } from '@/utils/mdast-create';
import { resolveInternalHref, VaultResolver } from '@/build-resolver';
import { replace } from '@/utils/mdast-replace';
import { getFileHref, getHeadingHash } from '@/utils/get-refs';

const RegexCalloutHead = /^\[!(?<type>\w+)](?<collapsible>\+)?/;

export interface RemarkConvertOptions {
  resolver: VaultResolver;
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

export function remarkConvert({
  resolver,
}: RemarkConvertOptions): Transformer<Root, Root> {
  return (tree, file) => {
    const sourceFile = file.data.source;
    if (!sourceFile) return;

    visit(tree, ['blockquote', 'link', 'image'], (node) => {
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
          const [ref, heading] = resolveInternalHref(url, sourceFile, resolver);
          if (!ref) return 'skip';

          node.url = getFileHref(ref, sourceFile, heading);
        }

        return 'skip';
      }
    });
  };
}
