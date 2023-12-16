import { StarsIcon } from 'lucide-react';
import { Layout } from 'next-docs-ui/layout';
import type { ReactNode } from 'react';
import { NavChildren } from '@/components/nav';

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <Layout
      links={[
        {
          text: 'Showcase',
          url: '/showcase',
        },
      ]}
      nav={{
        title: (
          <>
            <StarsIcon className="h-5 w-5" fill="currentColor" />
            <span className="ml-1.5 font-semibold max-sm:hidden">
              Next Docs
            </span>
          </>
        ),
        children: <NavChildren />,
        githubUrl: 'https://github.com/fuma-nama/next-docs',
      }}
    >
      {children}
    </Layout>
  );
}
