import type { ReactNode } from 'react';
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
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';
import { Provider, type ProviderProps } from '@/components/provider';
import { baseOptions } from '@/lib/layout.shared';
import { docsRoute } from '@/lib/shared';

interface DocsProps {
  page: 'docs';
  tree: SerializedPageTree;
  title: string;
  description?: string;
  toc: TOCItemType[];
  markdownUrl: string;
  githubUrl: string;
  children?: ReactNode;
}

export type AppProps = ProviderProps & (DocsProps | { page: 'home' | 'not-found' });

/**
 * The React island of every page, with `transition:persist` it keeps its state (e.g. search) across navigations.
 */
export function App(props: AppProps) {
  return (
    <Provider pathname={props.pathname} params={props.params}>
      {props.page === 'docs' ? (
        <Docs {...props} />
      ) : (
        <HomeLayout {...baseOptions()}>
          {props.page === 'home' ? <Home /> : <DefaultNotFound />}
        </HomeLayout>
      )}
    </Provider>
  );
}

function Docs({ tree, title, description, toc, markdownUrl, githubUrl, children }: DocsProps) {
  const data = useFumadocsLoader({ tree });

  return (
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
  );
}

function Home() {
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
      <h1 className="text-xl font-bold mb-2">Fumadocs on Astro.</h1>
      <p className="text-fd-muted-foreground mb-4">
        The truly flexible docs framework on React.js.
      </p>
      <a
        className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5"
        href={docsRoute}
      >
        Open Docs
      </a>
    </div>
  );
}
