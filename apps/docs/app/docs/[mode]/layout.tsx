import { DocsLayout } from 'next-docs-ui/layout';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';
import { getUtils } from '@/utils/source';

export default function Layout({
  params,
  children,
}: {
  params: { mode: string };
  children: ReactNode;
}): JSX.Element {
  const tree = getUtils(params.mode).tree;
  const currentMode =
    modes.find((mode) => mode.param === params.mode) ?? modes[0];
  const Icon = currentMode.icon;

  return (
    <DocsLayout
      tree={tree}
      nav={{ enabled: false }}
      sidebar={{
        defaultOpenLevel: 0,
        banner: (
          <div className="-mt-2 flex flex-row items-center gap-2 rounded-lg p-2 text-card-foreground transition-colors hover:bg-muted/80">
            <Icon
              className={cn(
                'h-9 w-9 shrink-0 rounded-md border border-primary/50 bg-gradient-to-b from-primary/50 p-1.5 text-primary',
                params.mode === 'ui' &&
                  '[--primary:213_98%_48%] dark:[--primary:213_94%_68%]',
                params.mode === 'headless' &&
                  '[--primary:270_95%_60%] dark:[--primary:270_95%_75%]',
              )}
            />
            <div>
              <p className="font-medium">{currentMode.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentMode.description} - {currentMode.version}
              </p>
            </div>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}

export function generateStaticParams(): { mode: string }[] {
  return modes.map((mode) => ({
    mode: mode.param,
  }));
}
