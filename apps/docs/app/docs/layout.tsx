import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { utils } from '@/utils/source';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
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
        banner: (
          <RootToggle
            options={modes.map((mode) => ({
              id: mode.param,
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
