import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { LayoutIcon, LibraryIcon } from 'lucide-react'
import Link from 'next/link'

const item = cva(
  'group relative overflow-hidden rounded-xl z-[2] p-px after:absolute after:-inset-px after:z-[-1] after:duration-300 after:transition-rotate-angle after:[--rotate-angle:-20deg] hover:after:[--rotate-angle:135deg]'
)

export default function DocsRoot() {
  return (
    <main className="container py-20">
      <div className="absolute right-0 top-0 z-[-1] h-[500px] w-full max-w-[1000px] translate-x-[-50%] translate-y-[-50%] blur-3xl">
        <div className="h-full w-full bg-gradient-to-r from-purple-400 to-blue-400 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>
      <h1 className="text-3xl font-bold sm:text-4xl">Choose One.</h1>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <Link
          href="/docs/headless"
          className={cn(
            item(),
            'after:bg-gradient-to-animated after:from-blue-500/30 after:to-purple-400'
          )}
        >
          <div className="bg-background h-full rounded-xl bg-gradient-to-br from-purple-400/20 p-6 group-hover:from-purple-400/10">
            <LibraryIcon className="mb-2 h-9 w-9 text-purple-400 dark:text-purple-200" />
            <p className="mb-2 text-lg font-semibold">Next Docs Zeta</p>
            <p className="text-muted-foreground text-sm">
              The Headless UI Library for building documentation websites.
            </p>
          </div>
        </Link>

        <Link
          href="/docs/ui"
          className={cn(
            item(),
            'after:bg-gradient-to-animated after:from-pink-500/20 after:to-blue-400'
          )}
        >
          <div className="bg-background h-full rounded-xl bg-gradient-to-br from-blue-400/20 p-6 group-hover:from-blue-400/10">
            <LayoutIcon className="mb-2 h-9 w-9 text-cyan-400 dark:text-cyan-200" />
            <p className="mb-2 text-lg font-semibold">Next Docs UI</p>
            <p className="text-muted-foreground text-sm">
              The Framework for building documentation websites with well
              designed UI.
            </p>
          </div>
        </Link>
      </div>
    </main>
  )
}
