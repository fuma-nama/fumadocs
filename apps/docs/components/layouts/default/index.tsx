import { baseOptions, linkItems, logo } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AIChat, AIChatTrigger } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import type { CSSProperties } from 'react';
import { ClientDocsLayout } from './client';
import 'katex/dist/katex.min.css';

export async function DefaultLayout({ params, children }: LayoutProps<'/[lang]/docs'>) {
  const { lang } = await params;
  const base = baseOptions();

  return (
    <AIChat>
      <ClientDocsLayout
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
        tabs={getLayoutTabs(source.getPageTree(lang), {
          transform(option, node) {
            const meta = source.getNodeMeta(node);
            if (!meta || !node.icon) return option;
            const color = `var(--${getSection(meta.path)}-color, var(--color-fd-foreground))`;

            return {
              ...option,
              icon: (
                <div
                  className="[&_svg]:size-full rounded-lg size-full text-(--tab-color) max-md:bg-(--tab-color)/10 max-md:border max-md:p-1.5"
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
        })}
      >
        {children}
        <AIChatTrigger />
      </ClientDocsLayout>
    </AIChat>
  );
}
