import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Callout, type CalloutType } from 'fumadocs-ui/components/callout';

export interface CalloutValue {
  _type: 'callout';
  title?: PortableTextBlock[];
  children?: PortableTextBlock[];
  type?: CalloutType;
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const calloutComponents: {
  callout: PortableTextTypeComponent<CalloutValue>;
} = {
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
};
