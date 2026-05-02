'use client';

import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Card } from 'fumadocs-ui/components/card';

interface CardValue {
  _type: 'card';
  title?: string;
  children?: PortableTextBlock[];
  url?: string;
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null;
}

export const cardComponents: Record<'card', PortableTextTypeComponent<CardValue>> = {
  card({ value, renderNode }) {
    return (
      <Card title={value.title} href={value.url}>
        {renderBlocks(value.children, renderNode)}
      </Card>
    );
  },
};
