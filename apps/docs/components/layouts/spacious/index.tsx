import { baseOptions, linkItems, logo } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AISearch } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { ClientSpaciousLayout } from './client';
import 'katex/dist/katex.min.css';

export function Spacious({ children }: { children: ReactNode }) {
  const base = baseOptions();
  const tabs = getLayoutTabs(source.getPageTree(), {
    transform(option, node) {
      const meta = source.getNodeMeta(node);
      if (!meta || !node.icon) return option;
      const color = `var(--${getSection(meta.path)}-color, var(--color-fd-foreground))`;

      return {
        ...option,
        icon: (
          <div className="text-(--tab-color)" style={{ '--tab-color': color } as CSSProperties}>
            {node.icon}
          </div>
        ),
      };
    },
  });

  return (
    <AISearch>
      <ClientSpaciousLayout
        {...base}
        tree={source.getPageTree()}
        // just icon items
        links={linkItems.filter((item) => item.type === 'icon')}
        nav={{
          ...base.nav,
          title: (
            <>
              {logo}
              <span className="font-medium in-[.uwu]:hidden">Fumadocs</span>
            </>
          ),
        }}
        tabs={tabs}
      >
        {children}
      </ClientSpaciousLayout>
    </AISearch>
  );
}
