import type {
  NodeRenderer,
  PortableTextBlock,
  PortableTextTypeComponent,
} from '@portabletext/react';
import { Tab, Tabs, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';

export interface TabValue {
  _key?: string;
  _type: 'tab';
  title?: string;
  body?: PortableTextBlock[];
}

export interface TabsValue {
  _type: 'tabs';
  items?: TabValue[];
}

function renderBlocks(blocks: PortableTextBlock[] | undefined, renderNode: NodeRenderer) {
  return (
    blocks?.map((node, index) => renderNode({ node, index, isInline: false, renderNode })) ?? null
  );
}

export const tabsComponents: {
  tab: PortableTextTypeComponent<TabValue>;
  tabs: PortableTextTypeComponent<TabsValue>;
} = {
  tab({ value, renderNode }) {
    return renderBlocks(value.body, renderNode);
  },
  tabs({ value, renderNode }) {
    const items = value.items ?? [];

    if (items.length === 0) return null;

    return (
      <Tabs>
        <TabsList>
          {items.map((item, i) => (
            <TabsTrigger key={item._key ?? i} value={item._key ?? i.toString()}>
              {item.title ?? `Tab ${i + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item, i) => (
          <Tab key={item._key ?? i} value={item._key ?? i.toString()}>
            {renderBlocks(item.body, renderNode)}
          </Tab>
        ))}
      </Tabs>
    );
  },
};
