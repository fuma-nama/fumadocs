import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { type ReactNode, useMemo } from 'react';
import { type Framework, FrameworkProvider } from 'fumadocs-core/framework';
import { RootProvider } from 'fumadocs-ui/provider';
import { type PageTree, type TableOfContents } from 'fumadocs-core/server';

export function Docs({
  pathname,
  title,
  description,
  toc,
  children,
  params,
  tree,
}: {
  pathname: string;
  params: Record<string, string | string[]>;
  toc: TableOfContents;
  title: string;
  description: string;
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const values = useMemo<Framework>(() => {
    return {
      usePathname: () => pathname,
      useParams: () => params,
      useRouter: () => ({
        push(path) {
          window.open(path);
        },
        refresh() {
          location.reload();
        },
      }),
      Link: ({ prefetch: _, ...props }) => <a {...props} />,
    };
  }, [pathname, params]);

  return (
    <FrameworkProvider {...values}>
      <RootProvider>
        <DocsLayout
          nav={{
            title: 'My Docs',
          }}
          tree={tree}
        >
          <DocsPage toc={toc}>
            <DocsTitle>{title}</DocsTitle>
            <DocsBody>{children}</DocsBody>
          </DocsPage>
        </DocsLayout>
      </RootProvider>
    </FrameworkProvider>
  );
}
