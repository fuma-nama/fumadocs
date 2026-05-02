import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

export interface AccordionValue {
  _key?: string;
  _type: 'accordion';
  title?: PortableTextBlock[];
  id?: string;
  value?: string;
  children?: PortableTextBlock[];
}

export interface AccordionsValue {
  _type: 'accordions';
  type?: 'single' | 'multiple';
  children?: AccordionValue[];
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const accordionComponents: {
  accordion: PortableTextTypeComponent<AccordionValue>;
  accordions: PortableTextTypeComponent<AccordionsValue>;
} = {
  accordion({ value, renderNode }) {
    return (
      <Accordions type="single">
        <Accordion
          title={value.title && renderBlocks(value.title, renderNode)}
          id={value.id}
          value={value.value ?? value._key}
        >
          {renderBlocks(value.children, renderNode)}
        </Accordion>
      </Accordions>
    );
  },
  accordions({ value, renderNode }) {
    return (
      <Accordions type={value.type ?? 'single'}>
        {value.children?.map((item) => (
          <Accordion
            key={item._key}
            title={item.title && renderBlocks(item.title, renderNode)}
            id={item.id}
            value={item.value ?? item._key}
          >
            {renderBlocks(item.children, renderNode)}
          </Accordion>
        ))}
      </Accordions>
    );
  },
};
