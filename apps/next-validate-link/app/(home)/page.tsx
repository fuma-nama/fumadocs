import { buttonVariants } from '@/components/ui/button';
import {
  CheckCircle,
  Github,
  Link as LinkIcon,
  FileText,
  HashIcon,
  CpuIcon,
  HeartIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Page() {
  return (
    <main className="flex-1">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Validate Your Markdown Links with Ease
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground mt-4 md:text-xl">
              next-validate-link is a powerful tool that ensures all your
              Markdown links in your Next.js app are valid and up-to-date.
            </p>
            <div className="flex flex-row gap-4">
              <Link href="/docs" className={cn(buttonVariants())}>
                Get Started
              </Link>
              <a
                href="https://github.com/fuma-nama/fumadocs/tree/dev/packages/next-validate-links"
                target="_blank"
                rel="noreferrer noopener"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <Github className="mr-2 size-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
      <section
        id="features"
        className="w-full py-12 md:py-24 lg:py-32 bg-muted"
      >
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CheckCircle className="size-6 mb-2 text-green-500" />
                <CardTitle>Link Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Automatically checks all Markdown links in your Next.js
                  project for validity.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <LinkIcon className="size-6 mb-2 text-blue-500" />
                <CardTitle>Broken Link Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Identifies and reports broken or outdated links in your
                  documentation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="size-6 mb-2 text-yellow-500" />
                <CardTitle>Markdown Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Works seamlessly with Markdown files in your Next.js project
                  structure.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <HashIcon className="size-6 mb-2 text-blue-500" />
                <CardTitle>Don't miss the section</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  URL fragment and query strings are validated, parsed directly
                  from Markdown pages.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CpuIcon className="size-6 mb-2 text-orange-500" />
                <CardTitle>Flexible</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Dynamic routes, route groups, with or without static params,
                  all checked.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <HeartIcon className="size-6 mb-2 text-pink-400" />
                <CardTitle>Integrate with Fumadocs</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Simplest way to validate links for your Fumadocs app.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
            How It Works
          </h2>
          <ol className="flex flex-col gap-4 max-w-[580px] mx-auto">
            <li className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                1
              </div>
              <p>next-validate-link scans your project for Markdown files.</p>
            </li>
            <li className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                2
              </div>
              <p>It extracts all links from the Markdown content.</p>
            </li>
            <li className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                3
              </div>
              <p>Each link is validated for correctness and accessibility.</p>
            </li>
            <li className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                4
              </div>
              <p>
                A report is generated with the results, highlighting any issues
                found.
              </p>
            </li>
          </ol>
        </div>
      </section>
      <section
        id="installation"
        className="w-full py-12 md:py-24 lg:py-32 bg-muted"
      >
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
            Installation
          </h2>
          <pre className="px-3 py-2 text-sm mx-auto w-fit rounded-xl border bg-card">
            <code>npm install next-validate-link</code>
          </pre>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
              Ready to Validate Your Links?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
              Start using next-validate-link today and ensure your Next.js app's
              documentation is always up-to-date.
            </p>
            <div className="space-x-4">
              <Link href="/docs" className={cn(buttonVariants())}>
                Get Started
              </Link>
              <a
                href="https://github.com/fuma-nama/fumadocs/tree/dev/packages/next-validate-links"
                target="_blank"
                rel="noreferrer noopener"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <Github className="mr-2 size-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
