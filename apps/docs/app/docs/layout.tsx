import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions, linkItems } from '@/app/layout.config';
import { source } from '@/lib/source';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Sparkles } from 'lucide-react';
import { AISearchTrigger } from '@/components/ai';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import 'katex/dist/katex.min.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions}
      tree={source.pageTree}
      // just icon items
      links={linkItems.filter((item) => item.type === 'icon')}
      searchToggle={{
        components: {
          lg: (
            <div className="flex gap-1.5 max-md:hidden">
              <LargeSearchToggle className="flex-1" />
              <AISearchTrigger
                className={cn(
                  buttonVariants({
                    variant: 'secondary',
                    size: 'xs',
                  }),
                  'px-2 gap-1.5 rounded-lg',
                )}
              >
                <Sparkles className="size-3.5 text-fd-primary fill-current" />
                Ask
              </AISearchTrigger>
            </div>
          ),
        },
      }}
      sidebar={{
        tabs: {
          transform(option, node) {
            const meta = source.getNodeMeta(node);
            if (!meta || !node.icon) return option;

            const color = `var(--${meta.file.dirname}-color, var(--color-fd-foreground))`;

            return {
              ...option,
              icon: (
                <div
                  className="rounded-lg p-1.5 shadow-lg ring-2 m-px border [&_svg]:size-6.5 md:[&_svg]:size-5"
                  style={
                    {
                      color,
                      borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
                      '--tw-ring-color': `color-mix(in oklab, ${color} 20%, transparent)`,
                    } as object
                  }
                >
                  {node.icon}
                </div>
              ),
            };
          },
        },
      }}
    >
      {children}
      <AISearchTrigger
        className={cn(
          buttonVariants({
            variant: 'secondary',
            className: 'fixed text-[15px] gap-2 right-4 bottom-4 md:hidden',
          }),
        )}
      >
        <Sparkles className="size-4 text-fd-primary fill-current" />
        Ask AI
      </AISearchTrigger>
    </DocsLayout>
  );
}
