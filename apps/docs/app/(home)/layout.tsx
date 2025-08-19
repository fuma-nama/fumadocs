import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions, linkItems } from '@/lib/layout.shared';
import {
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuLink,
  NavbarMenuTrigger,
} from 'fumadocs-ui/layouts/home/navbar';
import Link from 'fumadocs-core/link';
import Image from 'next/image';
import Preview from '@/public/banner.png';
import { Book, ComponentIcon, Pencil, PlusIcon, Server } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      {...baseOptions()}
      style={
        {
          '--spacing-fd-container': '1120px',
        } as object
      }
      links={[
        {
          type: 'menu',
          on: 'menu',
          text: 'Documentation',
          items: [
            {
              text: 'Getting Started',
              url: '/docs/ui',
              icon: <Book />,
            },
            {
              text: 'Components',
              url: '/docs/ui/components',
              icon: <ComponentIcon />,
            },
          ],
        },
        {
          type: 'custom',
          on: 'nav',
          children: (
            <NavbarMenu>
              <NavbarMenuTrigger>
                <Link href="/docs/ui">Documentation</Link>
              </NavbarMenuTrigger>
              <NavbarMenuContent className="text-[15px]">
                <NavbarMenuLink href="/docs/ui" className="md:row-span-2">
                  <div className="-mx-3 -mt-3">
                    <Image
                      src={Preview}
                      alt="Perview"
                      className="rounded-t-lg object-cover"
                      style={{
                        maskImage:
                          'linear-gradient(to bottom,white 60%,transparent)',
                      }}
                    />
                  </div>
                  <p className="font-medium">Getting Started</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Learn to use Fumadocs on your docs site.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink
                  href="/docs/ui/components"
                  className="lg:col-start-2"
                >
                  <ComponentIcon className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Components</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Add interactive experience to your docs.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink
                  href="/docs/ui/openapi"
                  className="lg:col-start-2"
                >
                  <Server className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">OpenAPI</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Generate interactive playgrounds and docs for your OpenAPI
                    schema.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink
                  href="/docs/ui/markdown"
                  className="lg:col-start-3 lg:row-start-1"
                >
                  <Pencil className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Markdown</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Learn the writing format/syntax of Fumadocs.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink
                  href="/docs/ui/manual-installation"
                  className="lg:col-start-3 lg:row-start-2"
                >
                  <PlusIcon className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Manual Installation</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Setup Fumadocs for your existing Next.js app.
                  </p>
                </NavbarMenuLink>
              </NavbarMenuContent>
            </NavbarMenu>
          ),
        },
        ...linkItems,
      ]}
      className="dark:bg-neutral-950 dark:[--color-fd-background:var(--color-neutral-950)]"
    >
      {children}
      <Footer />
    </HomeLayout>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-fd-card py-12 text-fd-secondary-foreground">
      <div className="container flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold">Fumadocs</p>
          <p className="text-xs">
            Built with ❤️ by{' '}
            <a
              href="https://fuma-dev.vercel.app"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium"
            >
              Fuma
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
