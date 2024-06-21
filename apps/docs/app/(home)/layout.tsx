import { Layout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { baseOptions } from '@/app/layout.config';

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <Layout {...baseOptions}>
      {children}
      <Footer />
    </Layout>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="py-6 md:px-8 md:py-0">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by{' '}
          <Link
            href="https://github.com/fuma-nama"
            className="underline underline-offset-2 transition-colors hover:text-primary/90"
            aria-label="Go to Fuma Nama's GitHub profile"
          >
            Fuma Nama
          </Link>{' '}
          . The source code is available on{' '}
          <Link
            href="https://github.com/fuma-nama/fumadocs"
            className="underline underline-offset-2 transition-colors hover:text-primary/90"
            aria-label="Go the the source code on GitHub"
          >
            GitHub
          </Link>
        </p>
      </div>
    </footer>
  );
}
