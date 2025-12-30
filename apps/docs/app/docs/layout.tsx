import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions, linkItems, logo } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';
import 'katex/dist/katex.min.css';
import { getSection } from '@/lib/source/navigation';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const base = baseOptions();

  return (
    <DocsLayout
      {...base}
      tree={source.pageTree}
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
        tabs: {
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

      <AISearch>
        <AISearchPanel />
        <AISearchTrigger />
      </AISearch>
    </DocsLayout>
  );
}
