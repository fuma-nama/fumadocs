import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions, linkItems, logo } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Sparkles } from 'lucide-react';
import { AISearchTrigger } from '@/components/ai';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import 'katex/dist/katex.min.css';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const base = baseOptions();

  return (
    <DocsLayout
      {...base}
      tree={source.pageTree}
      // just icon items
      links={linkItems.filter((item) => item.type === 'icon')}
      searchToggle={{
        components: {
          lg: (
            <div className="flex gap-1.5 max-md:hidden">
              <LargeSearchToggle className="flex-1" />
              <AISearchTrigger
                aria-label="Ask AI"
                className={cn(
                  buttonVariants({
                    variant: 'outline',
                    size: 'icon',
                    className: 'text-fd-muted-foreground',
                  }),
                )}
              >
                <Sparkles className="size-4" />
              </AISearchTrigger>
            </div>
          ),
        },
      }}
      nav={{
        ...base.nav,
        title: (
          <>
            {logo}
            <span className="font-medium [.uwu_&]:hidden max-md:hidden">
              Fumadocs
            </span>
          </>
        ),
        children: (
          <AISearchTrigger
            className={cn(
              buttonVariants({
                variant: 'secondary',
                size: 'sm',
                className:
                  'absolute left-1/2 top-1/2 -translate-1/2 text-fd-muted-foreground rounded-full gap-2 md:hidden',
              }),
            )}
          >
            <Sparkles className="size-4.5 fill-current" />
            Ask AI
          </AISearchTrigger>
        ),
      }}
      sidebar={{
        tabs: {
          transform(option, node) {
            const meta = source.getNodeMeta(node);
            if (!meta || !node.icon) return option;

            const color = `var(--${meta.path.split('/')[0]}-color, var(--color-fd-foreground))`;

            return {
              ...option,
              icon: (
                <div
                  className="[&_svg]:size-full rounded-lg size-full text-(--tab-color) max-md:bg-(--tab-color)/10 max-md:border max-md:p-1.5"
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
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
