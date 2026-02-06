import { baseOptions, linkItems, logo } from '@/components/layouts/shared';
import { source } from '@/lib/source';
import { getSection } from '@/lib/source/navigation';
import { getSidebarTabs } from 'fumadocs-ui/components/sidebar/tabs/index';
import type { ReactNode } from 'react';
import { LayoutClient } from './client';

export function FluxLayout({ children }: { children: ReactNode }) {
  const base = baseOptions();

  return (
    <LayoutClient
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
      sidebar={{
        tabs: getSidebarTabs(source.getPageTree(), {
          transform(option, node) {
            const meta = source.getNodeMeta(node);
            if (!meta || !node.icon) return option;
            const color = `var(--${getSection(meta.path)}-color, var(--color-fd-foreground))`;

            return {
              ...option,
              icon: (
                <div
                  className="[&_svg]:size-full size-full text-(--tab-color)"
                  style={
                    {
                      '--tab-color': color,
                    } as object
                  }
                >
                  {node.icon}
                </div>
              ),
            };
          },
        }),
      }}
    >
      {children}
    </LayoutClient>
  );
}
