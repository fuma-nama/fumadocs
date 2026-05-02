'use client';

import {
  toPlainText,
  type NodeRenderer,
  type PortableTextBlock,
  type PortableTextTypeComponent,
} from '@portabletext/react';
import { Callout, type CalloutType } from 'fumadocs-ui/components/callout';

interface CalloutValue {
  _type: 'callout';
  title?: PortableTextBlock[];
  children?: PortableTextBlock[];
  type?: CalloutType;
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null;
}

export const calloutComponents: Record<'callout', PortableTextTypeComponent<CalloutValue>> = {
  callout({ value, renderNode }) {
    const title = value.title ? toPlainText(value.title) : undefined;

    return (
      <Callout title={title} type={value.type}>
        {renderBlocks(value.children, renderNode)}
      </Callout>
    );
  },
};
