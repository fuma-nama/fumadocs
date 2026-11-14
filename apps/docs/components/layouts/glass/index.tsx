import { baseOptions, linkItems, logo } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AIChat } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import type { CSSProperties } from 'react';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { ClientGlassLayout } from './client';
import 'katex/dist/katex.min.css';

export async function Glass({ params, children }: LayoutProps<'/[lang]/docs'>) {
  const { lang } = await params;
  const base = baseOptions();
  const tabs = getLayoutTabs(source.getPageTree(lang), {
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
    <AIChat>
      <ClientGlassLayout
        {...base}
        tree={source.getPageTree(lang)}
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
        {children}
      </ClientGlassLayout>
    </AIChat>
  );
}
