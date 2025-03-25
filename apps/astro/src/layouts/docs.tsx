import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { type ReactNode, useEffect, useMemo } from 'react';
import { type Framework, FrameworkProvider } from 'fumadocs-core/framework';
import { RootProvider } from 'fumadocs-ui/provider';
import { type PageTree } from 'fumadocs-core/server';
import { navigate } from 'astro:transitions/client';

export default function Docs({
  pathname,
  children,
  params,
  tree,
}: {
  pathname: string;
  params: Record<string, string | string[]>;
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const values = useMemo<Framework>(() => {
    return {
      usePathname: () => pathname,
      useParams: () => params,
      useRouter: () => ({
        push(path) {
          navigate(path);
        },
        refresh() {
          location.reload();
        },
      }),
      Link: ({ prefetch: _, ...props }) => <a {...props} />,
    };
  }, [pathname, params]);

  useEffect(() => {
    console.log('mount');

    return () => {
      console.log('unmount');
    };
  }, []);

  return (
    <FrameworkProvider {...values}>
      <RootProvider>
        <DocsLayout
          nav={{
            title: 'My Docs',
          }}
          tree={tree}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </FrameworkProvider>
  );
}
