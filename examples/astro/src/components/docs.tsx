import { type SerializedPageTree, useFumadocsLoader } from 'fumadocs-core/source/client';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { Provider, type ProviderProps } from '@/components/provider';
import { baseOptions } from '@/lib/layout.shared';

export interface DocsProps extends ProviderProps {
  tree: SerializedPageTree;
  title: string;
  description?: string;
  toc: TOCItemType[];
  markdownUrl: string;
  githubUrl: string;
}

/**
 * The React island of docs pages, the content is passed as children.
 */
export function Docs({
  tree,
  title,
  description,
  toc,
  markdownUrl,
  githubUrl,
  children,
  ...props
}: DocsProps) {
  const data = useFumadocsLoader({ tree });

  return (
    <Provider {...props}>
      <DocsLayout {...baseOptions()} tree={data.tree}>
        <DocsPage toc={toc}>
          <DocsTitle>{title}</DocsTitle>
          <DocsDescription>{description}</DocsDescription>
          <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
          </div>
          {children}
        </DocsPage>
      </DocsLayout>
    </Provider>
  );
}
