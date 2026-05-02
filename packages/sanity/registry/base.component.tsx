import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextBlockComponent,
  PortableTextMarkComponent,
  PortableTextTypeComponent,
} from '@portabletext/react';
import Link from 'fumadocs-core/link';
import { Heading } from 'fumadocs-ui/components/heading';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { Callout, type CalloutType } from 'fumadocs-ui/components/callout';
import { Cards, Card } from 'fumadocs-ui/components/card';

const baseHeading: PortableTextBlockComponent = (props) => {
  return (
    <Heading id={props.value._key} as={props.value.style as 'h1'}>
      {props.children}
    </Heading>
  );
};

export const baseBlocks: Record<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  PortableTextBlockComponent
> = {
  h1: baseHeading,
  h2: baseHeading,
  h3: baseHeading,
  h4: baseHeading,
  h5: baseHeading,
  h6: baseHeading,
};

export interface CodeValue {
  _type: 'code';
  language?: string;
  code?: string;
}

export interface CalloutValue {
  _type: 'callout';
  title?: PortableTextBlock[];
  children?: PortableTextBlock[];
  type?: CalloutType;
}

export interface CardsValue {
  _type: 'cards';
  children?: CardValue[];
}

export interface CardValue {
  _type: 'card';
  _key?: string;
  title?: PortableTextBlock[];
  children?: PortableTextBlock[];
  url?: string;
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const baseComponents: {
  code: PortableTextTypeComponent<CodeValue>;
  callout: PortableTextTypeComponent<CalloutValue>;
  card: PortableTextTypeComponent<CardValue>;
  cards: PortableTextTypeComponent<CardsValue>;
} = {
  code: (props) => (
    <DynamicCodeBlock lang={props.value.language ?? 'text'} code={props.value.code ?? ''} />
  ),
  callout({ value, renderNode }) {
    return (
      <Callout
        title={value.title ? renderBlocks(value.title, renderNode) : undefined}
        type={value.type}
      >
        {renderBlocks(value.children, renderNode)}
      </Callout>
    );
  },
  cards({ value, renderNode }) {
    return (
      <Cards>
        {value.children?.map((item, i) => (
          <Card
            key={item._key ?? i}
            title={item.title ? renderBlocks(item.title, renderNode) : undefined}
            href={item.url}
          >
            {renderBlocks(item.children, renderNode)}
          </Card>
        ))}
      </Cards>
    );
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

export const baseMarks: {
  links: PortableTextMarkComponent;
} = {
  links: (props) => (
    <Link href={props.value.href} key={props.markKey}>
      {props.children}
    </Link>
  ),
};
