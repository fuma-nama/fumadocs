import { buttonVariants } from '@/components/ui/button'
import ExampleImage2 from '@/public/example-2.png'
import ExampleImage from '@/public/example.png'
import { cn } from '@/utils/cn'
import {
  ExternalLinkIcon,
  LayoutIcon,
  LibraryIcon,
  StarIcon
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react'

export default function HomePage() {
  return (
    <main>
      <div className="absolute inset-x-0 top-0 h-[400px] w-full -translate-y-8 z-[-1]">
        <div className="h-full w-full mx-auto max-w-[1000px] bg-gradient-to-r from-purple-400/50 to-blue-400/50 [mask-image:radial-gradient(500px_80%_at_top_center,white,transparent)] animate-in fade-in duration-1000 opacity-50" />
      </div>
      <div className="container py-20 flex flex-col items-center text-center">
        <div className="bg-gradient-to-b from-blue-300 shadow-md shadow-purple-400/50 rounded-lg mb-6 animate-star">
          <StarIcon className="m-px p-3 w-12 h-12 bg-background text-foreground rounded-[inherit]" />
        </div>
        <h1 className="text-2xl font-bold mb-6 sm:text-5xl">Build Your Docs</h1>
        <p className="text-muted-foreground max-w-xl sm:text-lg">
          Next Docs is a library and full-powered framework for building
          documentation websites.
        </p>
        <div className="mt-14 grid grid-cols-1 max-w-4xl gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 md:grid-cols-2">
          <Link
            href="/docs/headless"
            className="group relative overflow-hidden p-px rounded-xl z-[2]"
          >
            <i className="absolute inset-0 opacity-0 transition-opacity z-[-1] animated-border group-hover:opacity-100" />
            <div className="absolute inset-px bg-background bg-gradient-radial rounded-[inherit] from-purple-400/20 to-purple-400/0 z-[-1]" />
            <div className="flex flex-col items-center rounded-[inherit] h-full z-[2] p-6 border sm:p-12">
              <div className="border p-3 bg-gradient-to-b from-purple-400/10 border-foreground/20 shadow-xl shadow-background/50 mb-6 rounded-xl">
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
            <i className="absolute inset-0 opacity-0 transition-opacity z-[-1] animated-border group-hover:opacity-100" />
            <div className="absolute inset-px bg-background bg-gradient-radial from-blue-400/20 to-blue-400/0 rounded-[inherit] z-[-1]" />
            <div className="flex flex-col items-center rounded-[inherit] h-full p-6 border sm:p-12">
              <div className="border p-3 bg-gradient-to-b from-blue-400/30 border-blue-500/50 shadow-xl shadow-background/50 mb-6 rounded-xl">
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

      <section className="[perspective:2000px] overflow-hidden">
        <div className="relative [transform:rotateX(40deg)] min-w-[600px] max-w-[1200px] mx-auto animate-in duration-1000 fade-in">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-50%" />
          <div className="absolute -inset-6 bottom-20 bg-gradient-to-r from-purple-400/30 to-blue-300/30 blur-xl z-[-1] animate-pulse" />
          <Image
            alt="example"
            src={ExampleImage}
            className="rounded-2xl bg-background"
            priority
          />
        </div>
      </section>
      <div className="container mt-24 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="bg-background relative z-[2] flex flex-col overflow-hidden rounded-2xl border p-8">
          <div className="relative z-[-1] mx-auto mb-20">
            <div className="absolute inset-8 z-[-1] animate-pulse bg-purple-300/50 blur-3xl" />
            <Rocket className="text-purple-400 dark:text-purple-200 mx-auto [mask-image:linear-gradient(to_bottom,white_50%,transparent_90%)]" />
          </div>
          <div className="from-background/30 absolute inset-0 flex flex-col bg-gradient-to-b from-10% to-purple-500/20 p-8">
            <div className="mt-auto text-center">
              <p className="mb-2 text-xl font-medium">Lightning Fast</p>
              <p className="text-muted-foreground max-sm:text-sm">
                Built for App Router and work with Pages Router
              </p>
            </div>
          </div>
        </div>
        <div className="bg-background relative z-[2] flex flex-col overflow-hidden rounded-2xl border p-8">
          <div className="z-[-1] mx-auto mb-28 flex rounded-3xl border bg-gradient-to-b from-transparent to-cyan-500/30 px-24 shadow-2xl shadow-cyan-400/30">
            <Heart className="mx-auto" />
          </div>
          <div className="from-background/30 absolute inset-0 flex flex-col bg-gradient-to-b from-10% to-blue-500/20 p-8">
            <div className="mt-auto text-center">
              <p className="mb-2 text-xl font-medium">
                First-class Developer Experience
              </p>
              <p className="text-muted-foreground max-sm:text-sm">
                Install, Code, Deploy within a minute
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[-300px] h-[400px] bg-gradient-to-r from-purple-400 to-blue-400 opacity-30 [mask-image:linear-gradient(to_top,white,transparent)] lg:via-transparent lg:to-blue-400" />
      <div className="container text-center mt-20 max-w-4xl">
        <div className="mx-auto w-fit border border-blue-400 shadow-lg shadow-blue-400/50 rounded-md p-2 mb-6">
          <LayoutIcon />
        </div>
        <h2 className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 font-semibold mb-4 sm:text-4xl sm:leading-snug">
          Next Framework for Your&nbsp;Docs
        </h2>
        <p className="text-muted-foreground mx-auto max-w-2xl sm:text-lg">
          Next Docs UI focus on performance and DX, allowing you to customise
          everything with less configuration.
        </p>
      </div>

      <div className="relative z-[-1] mt-14 blur-3xl">
        <div className="absolute top-12 left-0 [mask-image:linear-gradient(to_right,transparent,white,transparent)] bg-gradient-to-r from-purple-400 to-blue-400 w-full h-[400px]" />
      </div>

      <div className="container max-w-[1400px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8 mt-10">
        <div className="relative z-[2] p-8 col-span-full rounded-3xl bg-gradient-to-bl from-cyan-400 to-pink-400 text-center text-cyan-50 overflow-hidden sm:p-12 max-sm:max-h-[400px] dark:from-cyan-700 dark:to-purple-900">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Everything from Next.js
          </h2>
          <p className="text-sm mb-12 md:text-base">
            Built for Next.js App Router, with the full power of React Server
            Components.
          </p>
          <Image
            alt="example"
            src={ExampleImage2}
            className="rounded-3xl shadow-lg shadow-black min-w-[500px] w-full max-w-[1000px] m-auto"
          />
          <div className="absolute w-[90%] h-[60%] bg-gradient-to-br from-white/50 border border-white rounded-3xl left-[50%] translate-x-[-50%] translate-y-[-50%] top-[80%] sm:top-[60%] z-[-1]" />
        </div>

        <div className="border p-12 rounded-3xl text-center flex flex-col items-center bg-gradient-to-br from-background md:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Light and Fast</h2>
          <p className="text-muted-foreground">
            Full powered documentation website with ~130 KB first load js size
          </p>
        </div>
        <div className="border p-12 rounded-3xl text-center flex flex-col justify-center bg-gradient-to-br from-background">
          <h2 className="text-2xl font-semibold mb-4">Optimized</h2>
          <p className="text-muted-foreground">
            Optimize your images and links by default
          </p>
        </div>
        <div className="border p-12 rounded-3xl text-center flex flex-col justify-center bg-gradient-to-br from-background">
          <h2 className="text-2xl font-semibold mb-4">A11y & UX</h2>
          <p className="text-muted-foreground">
            Focus on user experience and accessibility
          </p>
        </div>
        <div className="border p-12 rounded-3xl text-center flex flex-col justify-center bg-gradient-to-br from-background">
          <h2 className="text-2xl font-semibold mb-4">Light and Dark</h2>
          <p className="text-muted-foreground">Let your eyes rest</p>
        </div>
        <div className="border p-12 rounded-3xl text-center flex flex-col justify-center bg-gradient-to-br from-background">
          <h2 className="text-2xl font-semibold mb-4">And More...</h2>
          <p className="text-muted-foreground">
            Remote source, Components, and Utilities
          </p>
        </div>
        <div className="col-span-full h-[300px] mt-[-300px] bg-gradient-to-r from-purple-400/30 to-cyan-400/30 z-[-1] blur-3xl" />
      </div>

      <div className="relative border-t bg-gradient-to-b from-muted mt-40 z-[2]">
        <div className="container my-40 flex flex-col gap-2 items-center text-center">
          <h2 className="text-3xl font-semibold">Install Now</h2>
          <p className="text-muted-foreground">Stop waiting, go play it.</p>
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
        <div className="h-[120px] bg-gradient-to-r from-purple-400 to-blue-400 opacity-30 [mask-image:linear-gradient(to_top,white,transparent)] md:via-transparent md:to-blue-400" />
      </div>
    </main>
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
    <svg width="178" height="159" viewBox="0 0 178 159" fill="none" {...props}>
      <g filter="url(#filter0_d_2_135)">
        <path
          d="M52 39H76M46 45.5L80 45.5M44 51.5L84 51.5M43 57.5H135M44 63.5H134M45 69.5H133M49 75.5H129M53 81.5H125M57 87.5H121M62 93.5H116M68 99.5H110M75 105.5H103M82.5 111.5H97.5M126 39H102M132 45.5L98 45.5M134 51.5L94 51.5"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-heart stroke-cyan-600 dark:stroke-cyan-200"
          strokeDasharray={200}
        />
      </g>
      <defs>
        <filter
          id="filter0_d_2_135"
          x="0"
          y="0"
          width="178"
          height="158.5"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="21" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.7875 0 0 0 0 0.9745 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_2_135"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_2_135"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}
