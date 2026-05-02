import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Card, Cards } from 'fumadocs-ui/components/card';

export interface CardsValue {
  _type: 'cards';
  children?: PortableTextBlock[];
}

export interface CardValue {
  _type: 'card';
  title?: PortableTextBlock[];
  children?: PortableTextBlock[];
  url?: string;
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const cardComponents: {
  card: PortableTextTypeComponent<CardValue>;
  cards: PortableTextTypeComponent<CardsValue>;
} = {
  cards({ value, renderNode }) {
    return <Cards>{renderBlocks(value.children, renderNode)}</Cards>;
  },
  card({ value, renderNode }) {
    return (
      <Card
        title={value.title ? renderBlocks(value.title, renderNode) : undefined}
        href={value.url}
      >
        {renderBlocks(value.children, renderNode)}
      </Card>
    );
  },
};
