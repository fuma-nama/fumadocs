import type { ReactNode } from 'react';
import { type SerializedPageTree, useFumadocsLoader } from 'fumadocs-core/source/client';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';
import { Provider, type ProviderProps } from '@/components/provider';
import { i18n } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';

interface DocsProps {
  page: 'docs';
  lang: string;
  tree: SerializedPageTree;
  title: string;
  description?: string;
  toc: TOCItemType[];
  children?: ReactNode;
}

export type AppProps = ProviderProps & (DocsProps | { page: 'home' | 'not-found' });

/**
 * The React island of every page, with `transition:persist` it keeps its state (e.g. search) across navigations.
 */
export function App(props: AppProps) {
  return (
    <Provider lang={props.lang} pathname={props.pathname} params={props.params}>
      {props.page === 'docs' ? (
        <Docs {...props} />
      ) : (
        <HomeLayout {...baseOptions(props.lang)}>
          {props.page === 'home' ? <Home lang={props.lang} /> : <DefaultNotFound />}
        </HomeLayout>
      )}
    </Provider>
  );
}

function Docs({ lang, tree, title, description, toc, children }: DocsProps) {
  const data = useFumadocsLoader({ tree });

  return (
    <DocsLayout {...baseOptions(lang)} tree={data.tree}>
      <DocsPage toc={toc}>
        <DocsTitle>{title}</DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        {children}
      </DocsPage>
    </DocsLayout>
  );
}

function Home({ lang }: { lang: string }) {
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
      <h1 className="text-xl font-bold mb-2">Fumadocs on Astro.</h1>
      <p className="text-fd-muted-foreground mb-4">
        The truly flexible docs framework on React.js.
      </p>
      <a
        className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5"
        href={lang === i18n.defaultLanguage ? '/docs' : `/${lang}/docs`}
      >
        Open Docs
      </a>
    </div>
  );
}
