import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import type { DocsPageProps } from '@fumadocs/astro/config';
import { gitConfig } from '@/lib/shared';

/**
 * The docs page, the content is passed as children.
 */
export default function Docs({ tree, page, layout, children }: DocsPageProps) {
  // pages of OpenAPI have no source file
  const githubUrl =
    page.type === 'docs'
      ? `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`
      : undefined;

  return (
    <DocsLayout {...layout} tree={tree}>
      <DocsPage toc={page.toc} full={page.full}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription>{page.description}</DocsDescription>
        {page.markdownUrl && (
          <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
            <MarkdownCopyButton markdownUrl={page.markdownUrl} />
            <ViewOptionsPopover markdownUrl={page.markdownUrl} githubUrl={githubUrl} />
          </div>
        )}
        {children}
      </DocsPage>
    </DocsLayout>
  );
}
