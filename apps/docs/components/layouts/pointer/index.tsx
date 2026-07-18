import { baseOptions, linkItems, logo } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AISearch, AISearchPanel } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { ClientPointerLayout } from './client';
import 'katex/dist/katex.min.css';

export function Pointer({ children }: { children: ReactNode }) {
  const base = baseOptions();
  const tabs = getLayoutTabs(source.getPageTree(), {
    transform(option, node) {
      const meta = source.getNodeMeta(node);
      if (!meta || !node.icon) return option;
      const color = `var(--${getSection(meta.path)}-color, var(--color-fd-foreground))`;

      return {
        ...option,
        icon: (
          <div
            key=""
            className="text-(--tab-color)"
            style={
              {
                '--tab-color': color,
              } as CSSProperties
            }
          >
            {node.icon}
          </div>
        ),
      };
    },
  });

  return (
    <AISearch>
      <ClientPointerLayout
        {...base}
        tree={source.getPageTree()}
        // just icon items
        links={linkItems.filter((item) => item.type === 'icon')}
        nav={{
          ...base.nav,
          title: (
            <>
              {logo}
              <span className="font-medium in-[.uwu]:hidden max-md:hidden">Fumadocs</span>
            </>
          ),
        }}
        tabs={tabs}
      >
        <AISearchPanel />
        {children}
      </ClientPointerLayout>
    </AISearch>
  );
}
