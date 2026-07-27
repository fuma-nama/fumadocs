'use client';

import { Tabs } from '@base-ui/react/tabs';
import type { ReactNode } from 'react';

export interface NotionTabItem {
  id: string;
  label: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}

export function NotionTabs({ id, tabs }: { id: string; tabs: NotionTabItem[] }) {
  const defaultValue = tabs[0]?.id;
  if (!defaultValue) return null;

  return (
    <Tabs.Root
      className="my-5 overflow-hidden rounded-xl border border-fd-border bg-fd-secondary text-fd-secondary-foreground"
      data-notion-block="tabs"
      defaultValue={defaultValue}
      id={id}
    >
      <Tabs.List className="flex gap-1 overflow-x-auto border-b border-fd-border p-1">
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.id}
            className="inline-flex min-h-11 min-w-max items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-fd-muted-foreground outline-none transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:ring-2 focus-visible:ring-fd-ring data-active:bg-fd-background data-active:text-fd-foreground"
            value={tab.id}
          >
            {tab.icon}
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel
          key={tab.id}
          className="rounded-b-xl bg-fd-background p-4 text-[0.9375rem] text-fd-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-ring"
          keepMounted
          value={tab.id}
        >
          {tab.children}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
