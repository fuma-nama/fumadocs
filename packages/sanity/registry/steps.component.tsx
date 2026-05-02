import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Step, Steps } from 'fumadocs-ui/components/steps';

export interface StepValue {
  _key?: string;
  _type: 'step';
  body?: PortableTextBlock[];
}

export interface StepsValue {
  _type: 'steps';
  items?: StepValue[];
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const stepsComponents: {
  step: PortableTextTypeComponent<StepValue>;
  steps: PortableTextTypeComponent<StepsValue>;
} = {
  step({ value, renderNode }) {
    return <Step>{renderBlocks(value.body, renderNode)}</Step>;
  },
  steps({ value, renderNode }) {
    return (
      <Steps>
        {value.items?.map((item, index) => (
          <Step key={item._key ?? index}>{renderBlocks(item.body, renderNode)}</Step>
        ))}
      </Steps>
    );
  },
};
