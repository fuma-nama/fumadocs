import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsPage, type DocsPageProps } from 'fumadocs-ui/page';
import type { Root } from 'fumadocs-core/page-tree';
import type { ReactNode } from 'react';
import { FrameworkProvider } from 'fumadocs-core/framework';
import { navigate } from 'astro:transitions/client';
import { RootProvider } from 'fumadocs-ui/provider/base';

export function Docs({
  tree,
  children,
  pathname,
  params,
  page,
}: {
  tree: Root;
  children: ReactNode;
  pathname: string;
  params: Record<string, string | string[]>;
  page?: DocsPageProps;
}) {
  return (
    <FrameworkProvider
      usePathname={() => pathname}
      useParams={() => params}
      useRouter={() => ({
        push(pathname) {
          void navigate(pathname);
        },
        refresh() {
          window.location.reload();
        },
      })}
    >
      <RootProvider theme={{ enabled: false }}>
        <DocsLayout
          tree={tree}
          nav={{
            title: 'Fumadocs on Astro',
          }}
        >
          <DocsPage {...page}>{children}</DocsPage>
        </DocsLayout>
      </RootProvider>
    </FrameworkProvider>
  );
}
