import { baseOptions, linkItems } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { AIChat } from '@/components/inkeep/search';
import { getSection } from '@/lib/source/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { isFramework } from '@/lib/framework';
import { FrameworkLogo } from '@/components/framework-logo';
import { ClientSpaciousLayout } from './client';
import 'katex/dist/katex.min.css';

export function Spacious({ children }: { children: ReactNode }) {
  const base = baseOptions();
  const tabs = getLayoutTabs(source.getPageTree(), {
    transform(option, node) {
      // the root folder of a framework, like `(framework)/next`
      const framework = node.$id?.replace('(framework)/', '');
      if (node.root === 'framework' && isFramework(framework))
        return {
          ...option,
          icon: <FrameworkLogo framework={framework} />,
        };

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
        tree={source.getPageTree()}
        // just icon items
        links={linkItems.filter((item) => item.type === 'icon')}
        tabs={tabs}
      >
        {children}
      </ClientSpaciousLayout>
    </AIChat>
  );
}
