import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { baseOptions } from '@/app/layout.config';
import { utils } from '@/utils/source';
import { modes } from '@/utils/modes';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <DocsLayout
      {...baseOptions}
      tree={utils.pageTree}
      sidebar={{
        defaultOpenLevel: 0,
        banner: (
          <RootToggle
            options={modes.map((mode) => ({
              url: `/docs/${mode.param}`,
              icon: (
                <mode.icon
                  className="size-9 shrink-0 rounded-md bg-gradient-to-t from-background/80 p-1.5"
                  style={{
                    backgroundColor: `hsl(var(--${mode.param}-color)/.3)`,
                    color: `hsl(var(--${mode.param}-color))`,
                  }}
                />
              ),
              title: mode.name,
              description: mode.description,
            }))}
          />
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
