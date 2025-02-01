import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions, linkItems } from '@/app/layout.config';
import { source } from '@/lib/source';
import 'katex/dist/katex.min.css';

const docsOptions: DocsLayoutProps = {
  ...baseOptions,
  tree: source.pageTree,
  links: [linkItems[linkItems.length - 1]],
  sidebar: {
    tabs: {
      transform(option, node) {
        const meta = source.getNodeMeta(node);
        if (!meta) return option;

        return {
          ...option,
          icon: (
            <div
              className="rounded-md border bg-gradient-to-t from-fd-background/80 p-1 shadow-md [&_svg]:size-5"
              style={{
                color: `var(--${meta.file.dirname}-color)`,
                backgroundColor: `color-mix(in oklab, var(--${meta.file.dirname}-color) 40%, transparent)`,
              }}
            >
              {node.icon}
            </div>
          ),
        };
      },
    },
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...docsOptions}>{children}</DocsLayout>;
}
