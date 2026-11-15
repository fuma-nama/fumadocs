import { baseOptions, linkItems } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AIChat } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import type { CSSProperties } from 'react';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { ClientSpaciousLayout } from './client';
import 'katex/dist/katex.min.css';

export async function Spacious({ params, children }: LayoutProps<'/[lang]/docs'>) {
  const { lang } = await params;
  const base = baseOptions();
  const tabs = getLayoutTabs(source.getPageTree(lang), {
    transform(option, node) {
      // framework logos keep their colors
      if (node.root === 'framework') return option;

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
    <AIChat>
      <ClientSpaciousLayout
        {...base}
        tree={source.getPageTree(lang)}
        // just icon items
        links={linkItems.filter((item) => item.type === 'icon')}
        tabs={tabs}
      >
        {children}
      </ClientSpaciousLayout>
    </AIChat>
  );
}
