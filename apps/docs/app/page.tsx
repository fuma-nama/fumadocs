import { buttonVariants } from '@/components/ui/button'
import ExampleImage2 from '@/public/example-2.png'
import ExampleImage from '@/public/example.png'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import {
  AccessibilityIcon,
  ExternalLinkIcon,
  LayoutIcon,
  LibraryIcon,
  MoonIcon,
  RocketIcon,
  StarsIcon,
  TimerIcon
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react'

const separator = cva(
  'h-px bg-gradient-to-r from-transparent via-foreground/30'
)

export default function HomePage() {
  return (
    <main>
      <div className="absolute inset-0 overflow-hidden z-[-1]">
        <div className="relative mx-auto w-[720px] opacity-20 animate-in fade-in duration-1000">
          <i className="bg-gradient-radial from-purple-500 to-70% absolute top-52 left-0 w-[500px] h-[500px] rounded-full" />
          <i className="bg-gradient-radial from-blue-500 to-70% absolute top-0 right-0 w-[500px] h-[500px] rounded-full" />
        </div>
      </div>
      <div className="container py-20 flex flex-col items-center text-center gap-6">
        <div className="p-0.5 bg-gradient-to-b from-blue-300 to-purple-400 rounded-lg shadow-lg shadow-purple-400/50 mb-2">
          <StarsIcon className="w-12 h-12 p-2 bg-background rounded-[inherit]" />
        </div>
        <h1 className="text-3xl font-bold sm:text-5xl">Build Your Docs</h1>
        <p className="text-muted-foreground max-w-xl sm:text-lg">
          Next Docs is a library and full-powered framework for building
          documentation sites based on Next.js.
        </p>
        <div className="mt-8 grid grid-cols-1 max-w-4xl gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 sm:grid-cols-2">
          <Link
            href="/docs/headless"
            className="group relative overflow-hidden p-px rounded-xl z-[2]"
          >
            <i className="absolute inset-0 opacity-0 transition-opacity z-[-1] animated-border group-hover:opacity-100 before:from-purple-400 before:via-pink-400" />
            <div className="absolute inset-px bg-gradient-to-b from-card/90 to-background rounded-[inherit] z-[-1]" />
            <div className="flex flex-col items-center rounded-[inherit] h-full z-[2] p-6 border md:p-12">
              <div className="border p-3 bg-gradient-to-b from-purple-400/30 border-foreground/20 mb-6 rounded-xl">
                <LibraryIcon className="h-9 w-9 text-purple-400 dark:text-purple-200" />
              </div>
              <p className="mb-2 text-xl font-medium">Next Docs Zeta</p>
              <p className="text-muted-foreground">
                The Headless UI Library with maximized flexibility and
                functionality.
              </p>
            </div>
          </Link>

          <Link
            href="/docs/ui"
            className="group relative overflow-hidden rounded-xl p-px z-[2]"
          >
            <i className="absolute inset-0 opacity-0 transition-opacity z-[-1] animated-border group-hover:opacity-100 before:from-blue-400 before:via-cyan-500" />
            <div className="absolute inset-px bg-gradient-to-b from-card/90 to-background rounded-[inherit] z-[-1]" />
            <div className="flex flex-col items-center rounded-[inherit] h-full p-6 border md:p-12">
              <div className="border p-3 bg-gradient-to-b from-blue-400/30 border-blue-500/50 mb-6 rounded-xl">
                <LayoutIcon className="h-9 w-9 text-blue-400 dark:text-cyan-200" />
              </div>
              <p className="mb-2 text-xl font-medium">Next Docs UI</p>
              <p className="text-muted-foreground">
                The Framework for building documentation websites with excellent
                UI.
              </p>
            </div>
          </Link>
        </div>
      </div>
      <div className="container mt-20 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Brought to you by Fuma
        </p>
        <Comments />
      </div>
      <div className={cn(separator(), 'mt-12')} />
      <div className="relative py-40">
        <div className="container text-center">
          <h2 className="text-3xl font-medium mb-4 sm:text-5xl">
            Build in Seconds
          </h2>
          <p className="text-muted-foreground sm:text-lg">
            Create documentation sites with a command.
          </p>
        </div>
        <div className="overflow-hidden h-[400px] mt-12 max-md:hidden">
          <section className="container [perspective:2000px]">
            <div className="relative [transform:rotateX(30deg)] mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 to-blue-300/30 blur-xl z-[-1] animate-pulse" />
              <Image
                alt="example"
                src={ExampleImage}
                className="rounded-2xl bg-background"
                priority
              />
            </div>
          </section>
        </div>
        <HeroCards />
        <div className="absolute z-[-1] inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-10 [mask-image:linear-gradient(to_top,transparent,white,transparent)]" />
      </div>

      <div className={cn(separator())} />
      <div className="relative from-blue-600/10 py-40 dark:bg-gradient-to-t">
        <div className="container flex flex-col items-center text-center">
          <h2 className="text-3xl font-medium mb-6 sm:leading-snug sm:text-5xl">
            A Mind-blowing UI
            <br />
            Built for Your Docs
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl sm:text-lg">
            Next Docs UI focus on performance and DX, allowing you to customise
            everything with less configuration.
          </p>
        </div>

        <div className="container max-w-[1400px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8 mt-10">
          <div className="relative z-[2] p-8 col-span-full rounded-3xl bg-gradient-radial border border-foreground/10 text-center overflow-hidden sm:p-12 dark:from-blue-600/20">
            <h2 className="text-xl font-medium mb-4">
              Everything from Next.js
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Built for Next.js App Router, with the full power of React Server
              Components.
            </p>
            <Image
              alt="example"
              src={ExampleImage2}
              className="rounded-3xl shadow-xl shadow-background/50 min-w-[500px] w-full max-w-[1000px] m-auto"
            />
            <div className="absolute w-[90%] h-[60%] bg-gradient-to-b from-white/30 border border-foreground/10 rounded-3xl left-[50%] translate-x-[-50%] translate-y-[-50%] top-[80%] sm:top-[60%] z-[-1]" />
          </div>

          <Grid />
        </div>
        <div className={cn(separator(), 'absolute inset-x-0 bottom-0')} />
      </div>
      <div className="relative py-40 bg-gradient-to-b from-card flex flex-col gap-6 items-center text-center">
        <h2 className="text-2xl font-medium sm:text-4xl">
          Install Now.
          <br />
          Stop waiting, go play it.
        </h2>
        <a
          href="https://githubbox.com/SonMooSans/next-docs-ui-template"
          rel="noreferrer noopener"
          target="_blank"
          className={cn(buttonVariants({ className: 'mt-4 max-w-xl' }))}
        >
          Open in CodeSandbox
          <ExternalLinkIcon className="w-4 h-4 ml-2" />
        </a>
      </div>
    </main>
  )
}

function HeroCards() {
  const card = cva(
    'relative bg-background border border-foreground/10 z-[2] flex flex-col overflow-hidden rounded-2xl p-8'
  )

  return (
    <div className="container grid grid-cols-1 gap-8 mt-12 md:grid-cols-2 lg:grid-cols-3">
      <div className={cn(card())}>
        <div className="absolute inset-0 bg-gradient-radial from-purple-600/10 z-[-1]" />
        <Rocket className="text-purple-400 dark:text-purple-200 p-8 mx-auto" />
        <div className="text-center mt-auto">
          <p className="mb-4 text-xl font-medium">Lightning Fast</p>
          <p className="text-muted-foreground">
            Built for App Router and work with Pages Router
          </p>
        </div>
      </div>
      <div className={cn(card({ className: 'lg:col-span-2' }))}>
        <div className="absolute inset-0 bg-gradient-radial from-blue-600/10 z-[-1]" />
        <div className="mx-auto rounded-3xl px-24 bg-gradient-to-b from-blue-400/10 border border-foreground/10 my-6">
          <Heart />
        </div>
        <div className="text-center mt-auto">
          <p className="mb-4 text-xl font-medium">
            First-class Developer Experience
          </p>
          <p className="text-muted-foreground">
            Install, Code, Deploy within a minute
          </p>
        </div>
      </div>
    </div>
  )
}

function Comments() {
  return (
    <div className="bg-gradient-to-b from-card p-6 border rounded-md mx-auto max-w-4xl shadow-lg  ">
      <p>{`"I'm satisfied with it"`}</p>
      <div className="inline-flex items-center gap-2 mt-2">
        <a
          href="https://joulev.dev"
          target="_blank"
          rel="noreferrer noopener"
          className="text-sm font-medium"
        >
          @joulev
        </a>
        <p className="text-xs text-muted-foreground">
          - Moderator at Next.js Discord
        </p>
      </div>
    </div>
  )
}

function Grid() {
  const item = cva(
    'rounded-3xl md:text-center flex flex-col justify-center md:bg-gradient-to-b md:from-white/10 md:items-center md:border md:border-foreground/10 md:p-6'
  )
  const itemTitle = cva(
    'inline-flex items-center gap-1 font-medium mb-4 [&_svg]:w-4 [&_svg]:h-4'
  )
  const itemText = cva('text-sm text-muted-foreground')

  return (
    <>
      <div className={cn(item({ className: 'md:col-span-2' }))}>
        <h2 className={itemTitle()}>
          <RocketIcon />
          Light and Fast
        </h2>
        <p className={itemText()}>
          Full powered documentation website with ~130 KB first load js size
        </p>
      </div>
      <div className={cn(item())}>
        <h2 className={itemTitle()}>
          <TimerIcon />
          Optimized
        </h2>
        <p className={itemText()}>Optimize your images and links by default</p>
      </div>
      <div className={cn(item())}>
        <h2 className={itemTitle()}>
          <AccessibilityIcon />
          A11y & UX
        </h2>
        <p className={itemText()}>Focus on user experience and accessibility</p>
      </div>
      <div className={cn(item())}>
        <h2 className={itemTitle()}>
          <MoonIcon />
          Light and Dark
        </h2>
        <p className={itemText()}>Let your eyes rest</p>
      </div>
      <div className={cn(item())}>
        <h2 className={itemTitle()}>And More...</h2>
        <p className={itemText()}>Remote source, Components, and Utilities</p>
      </div>
    </>
  )
}

function Rocket(props: ComponentPropsWithRef<'svg'>) {
  return (
    <svg width="200" height="200" viewBox="0 0 512 512" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
        d="M461.81 53.81a4.4 4.4 0 0 0-3.3-3.39c-54.38-13.3-180 34.09-248.13 102.17a294.9 294.9 0 0 0-33.09 39.08c-21-1.9-42-.3-59.88 7.5c-50.49 22.2-65.18 80.18-69.28 105.07a9 9 0 0 0 9.8 10.4l81.07-8.9a180.29 180.29 0 0 0 1.1 18.3a18.15 18.15 0 0 0 5.3 11.09l31.39 31.39a18.15 18.15 0 0 0 11.1 5.3a179.91 179.91 0 0 0 18.19 1.1l-8.89 81a9 9 0 0 0 10.39 9.79c24.9-4 83-18.69 105.07-69.17c7.8-17.9 9.4-38.79 7.6-59.69a293.91 293.91 0 0 0 39.19-33.09c68.38-68 115.47-190.86 102.37-247.95ZM298.66 213.67a42.7 42.7 0 1 1 60.38 0a42.65 42.65 0 0 1-60.38 0Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
        d="M109.64 352a45.06 45.06 0 0 0-26.35 12.84C65.67 382.52 64 448 64 448s65.52-1.67 83.15-19.31A44.73 44.73 0 0 0 160 402.32"
      />
    </svg>
  )
}

function Heart(props: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="140" height="140" viewBox="0 0 178 159" fill="none" {...props}>
      <g>
        <path
          d="M52 39H76M46 45.5L80 45.5M44 51.5L84 51.5M43 57.5H135M44 63.5H134M45 69.5H133M49 75.5H129M53 81.5H125M57 87.5H121M62 93.5H116M68 99.5H110M75 105.5H103M82.5 111.5H97.5M126 39H102M132 45.5L98 45.5M134 51.5L94 51.5"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-heart stroke-cyan-600 dark:stroke-cyan-200"
          strokeDasharray={200}
        />
      </g>
    </svg>
  )
}
