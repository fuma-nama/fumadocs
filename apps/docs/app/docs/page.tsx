import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { LayoutIcon, LibrarySquareIcon, PaperclipIcon } from 'lucide-react'
import Link from 'next/link'

const cardVariants = cva(
  'flex flex-col gap-4 bg-background p-6 rounded-xl border border-transparent transition-colors hover:border-border hover:bg-card'
)

export default function DocsPage() {
  return (
    <main className="container flex flex-col items-center py-16 text-center">
      <div className="absolute inset-0 z-[-1] overflow-hidden [perspective:2000px]">
        <div
          className="bg-primary/30 animate-in fade-in absolute bottom-[20%] left-[50%] h-[1200px] w-[1200px] origin-bottom opacity-50 duration-1000"
          style={{
            transform: 'rotateX(75deg) translate(-50%, 400px)',
            backgroundImage:
              'radial-gradient(50% 50% at center,transparent,hsl(var(--background))), repeating-linear-gradient(to right,hsl(var(--primary)),hsl(var(--primary)) 1px,transparent 2px,transparent 100px), repeating-linear-gradient(to bottom,hsl(var(--primary)),hsl(var(--primary)) 2px,transparent 3px,transparent 100px)'
          }}
        />
      </div>
      <h1 className="mb-4 text-5xl font-medium">Choose one.</h1>
      <p className="text-muted-foreground">
        Different packages for different use cases.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <a
          href="https://github.com/fuma-nama/next-docs"
          rel="noreferrer noopener"
          className={cn(buttonVariants({ size: 'lg' }))}
        >
          Github
        </a>
        <Link
          href="/showcase"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
        >
          Showcase
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-4 text-left md:grid-cols-2 lg:grid-cols-3">
        <Link href="/docs/ui" className={cn(cardVariants())}>
          <LayoutIcon
            stroke="hsl(var(--background))"
            fill="url(#ui-gradient)"
            className="h-12 w-12"
          >
            <defs>
              <linearGradient id="ui-gradient" x1={0} x2={0} y1={0} y2={1}>
                <stop stopColor="rgb(150,150,255)" />
                <stop offset={1} stopColor="rgb(150,0,255)" />
              </linearGradient>
            </defs>
          </LayoutIcon>
          <h2 className="text-xl font-semibold">Next Docs UI</h2>
          <p className="text-muted-foreground">
            The full-powered documentation framework with an excellent UI.
          </p>
        </Link>
        <Link href="/docs/headless" className={cn(cardVariants())}>
          <LibrarySquareIcon
            fill="url(#gradient)"
            stroke="hsl(var(--background))"
            className="h-12 w-12"
          >
            <defs>
              <linearGradient id="gradient" x1={0} x2={1} y1={0} y2={1}>
                <stop stopColor="rgb(255,0,0)" />
                <stop offset="100%" stopColor="rgb(255,100,255)" />
              </linearGradient>
            </defs>
          </LibrarySquareIcon>
          <h2 className="text-xl font-semibold">Next Docs Zeta</h2>
          <p className="text-muted-foreground">
            Headless library with an useful set of utilities.
          </p>
        </Link>
        <Link
          href="/docs/mdx"
          className={cn(cardVariants({ className: 'md:max-lg:col-span-2' }))}
        >
          <PaperclipIcon
            fill="url(#mdx-gradient)"
            stroke="hsl(var(--background))"
            className="h-12 w-12"
          >
            <defs>
              <linearGradient id="mdx-gradient" x1={0} x2={1} y1={0} y2={1}>
                <stop stopColor="rgb(255,255,255)" />
                <stop offset="100%" stopColor="rgb(255,100,255)" />
              </linearGradient>
            </defs>
          </PaperclipIcon>
          <h2 className="text-xl font-semibold">Next Docs MDX</h2>
          <p className="text-muted-foreground">
            A Next.js plugin that enhances the official next/mdx loader.
          </p>
        </Link>
      </div>
    </main>
  )
}
