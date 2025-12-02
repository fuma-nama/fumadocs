'use client';
import { use, type ComponentProps } from 'react';
import { cn } from './utils/cn';
import * as Docs from './layouts/docs/page';
import * as Notebook from './layouts/notebook/page';
import { LayoutContext } from './layouts/docs/client';

// TODO: remove this compat layer on v17

export {
  DocsDescription,
  DocsTitle,
  EditOnGitHub,
  DocsBody,
  PageBreadcrumb,
  PageLastUpdate,
} from './layouts/docs/page';

interface EditOnGitHubOptions extends Omit<
  ComponentProps<'a'>,
  'href' | 'children'
> {
  owner: string;
  repo: string;

  /**
   * SHA or ref (branch or tag) name.
   *
   * @defaultValue main
   */
  sha?: string;

  /**
   * File path in the repo
   */
  path: string;
}

export interface DocsPageProps extends Docs.DocsPageProps {
  editOnGithub?: EditOnGitHubOptions;
  lastUpdate?: Date | string | number;
}

/**
 * For separate MDX page
 */
export function withArticle(props: ComponentProps<'main'>) {
  return (
    <main
      {...props}
      className={cn(
        'w-full max-w-[1400px] mx-auto px-4 py-12',
        props.className,
      )}
    >
      <article className="prose">{props.children}</article>
    </main>
  );
}

export function DocsPage({
  lastUpdate,
  editOnGithub,
  children,
  ...props
}: DocsPageProps) {
  const docsLayoutCtx = use(LayoutContext);
  const { DocsPage, EditOnGitHub, PageLastUpdate } = docsLayoutCtx
    ? Docs
    : Notebook;

  return (
    <DocsPage {...props}>
      {children}
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
        {editOnGithub && (
          <EditOnGitHub
            href={`https://github.com/${editOnGithub.owner}/${editOnGithub.repo}/blob/${editOnGithub.sha}/${editOnGithub.path.startsWith('/') ? editOnGithub.path.slice(1) : editOnGithub.path}`}
          />
        )}
        {lastUpdate && <PageLastUpdate date={new Date(lastUpdate)} />}
      </div>
    </DocsPage>
  );
}
