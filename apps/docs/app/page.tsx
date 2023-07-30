import { cn } from '@/utils/cn'
import { CopyIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react'

export default function HomePage() {
  return (
    <main
      className={cn(
        'text-muted-foreground flex flex-col',
        '[--foreground:186_93%_30%] [--muted-foreground:202_57%_49%] dark:[--foreground:186_93%_81%] dark:[--muted-foreground:202_57%_69%]'
      )}
    >
      <div className="absolute inset-x-0 top-0 flex">
        <div className="bg-gradient-radial-top mx-auto h-[300px] w-[1500px] max-w-[100vw] from-blue-500/10 to-80%" />
      </div>
      <Image
        src="/stars.png"
        alt="stars"
        width={650 / 1.2}
        height={627 / 1.2}
        className="absolute right-0 top-0 hidden dark:block"
        priority
      />
      <div className="absolute left-0 top-0 max-xl:hidden">
        <div className="ml-72 h-[500px] w-6 -rotate-45 rounded-full bg-gradient-to-b from-transparent via-purple-400/50 via-60% to-cyan-200" />
      </div>
      <Star className="animate-star absolute left-[10%] top-40 text-cyan-100 delay-200 max-lg:hidden" />
      <Star className="animate-star absolute left-[30%] top-72 scale-[.25] text-cyan-100 delay-700" />
      <Star className="animate-star absolute right-[10%] top-64 scale-50 text-pink-200 md:top-20" />
      <Star className="animate-star absolute right-[15%] top-96 text-pink-200 delay-1000 max-lg:hidden" />
      <Star className="animate-star absolute right-[30%] top-64 scale-50 text-pink-200 max-lg:hidden" />

      <div className="container z-[2] flex flex-col gap-4 pt-40 text-center">
        <div className="relative mx-auto">
          <div
            className="from-foreground/30 absolute -inset-x-20 top-0 z-[-1] h-full max-w-[100vw] bg-gradient-to-l to-purple-400/30 blur-3xl"
            aria-hidden
          />
          <h1 className="bg-gradient-to-b from-purple-400 from-20% to-cyan-300 bg-clip-text text-3xl font-bold text-transparent dark:from-purple-200 dark:from-20% dark:to-cyan-300 sm:text-5xl sm:leading-snug">
            Build Next.js Docs
            <br /> With Speed
          </h1>
        </div>
        <p>
          Next Docs is a framework built for building documentation websites in
          Next.js
        </p>
        <div className="mt-4 flex flex-row justify-center">
          <Link
            href="/docs"
            className="rounded-full bg-gradient-to-b from-cyan-200 to-cyan-300 px-8 py-2 font-medium text-cyan-950"
          >
            Get Started -&gt;
          </Link>
        </div>
      </div>
      <div className="container mt-24 grid grid-cols-1 gap-10 md:grid-cols-5">
        <div className="bg-background relative z-[2] flex flex-col overflow-hidden rounded-2xl border p-8 md:col-span-3">
          <div className="z-[-1] mx-auto mb-28 flex rounded-3xl border bg-gradient-to-b from-transparent to-cyan-500/30 px-24 shadow-2xl shadow-cyan-400/30">
            <Heart className="mx-auto" />
          </div>
          <div className="from-background/30 absolute inset-0 flex flex-col bg-gradient-to-b from-10% to-blue-500/30 p-8">
            <div className="mt-auto text-center">
              <p className="text-foreground mb-2 text-xl font-medium">
                First class Developer Experience
              </p>
              <p className="text-sm">Install, Code, Deploy within a minute</p>
            </div>
          </div>
        </div>
        <div className="bg-background relative z-[2] flex flex-col overflow-hidden rounded-2xl border p-8 md:col-span-2">
          <div className="relative z-[-1] mx-auto mb-20">
            <div className="absolute inset-8 z-[-1] animate-pulse bg-cyan-300/50 blur-3xl" />
            <Rocket className="text-foreground mx-auto [mask-image:linear-gradient(to_bottom,white_50%,transparent_90%)]" />
          </div>
          <div className="from-background/30 absolute inset-0 flex flex-col bg-gradient-to-b from-10% to-blue-500/30 p-8">
            <div className="mt-auto text-center">
              <p className="text-foreground mb-2 text-xl font-medium">
                Lightning Fast
              </p>
              <p className="text-sm">
                Built for App Router and work with Pages Router
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[-300px] h-[400px] bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />
      <div className="container mb-40 mt-20 flex flex-col items-center gap-2 text-center">
        <h2 className="text-foreground text-3xl font-semibold">Install Now</h2>
        <p className="text-sm">Stop waiting, go type it.</p>
        <pre className="text-foreground relative mt-4 rounded-full border border-blue-200/20 bg-blue-200/30 py-1.5 pl-4 pr-20 dark:bg-blue-500/20">
          npm install next-docs-zeta
          <button className="absolute inset-y-2 right-2 rounded-full">
            <CopyIcon className="h-4 w-4" />
          </button>
        </pre>
      </div>
    </main>
  )
}

function Star(props: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="91" height="268" viewBox="0 0 91 268" fill="none" {...props}>
      <path
        d="M91 134.177C58.7846 134.177 47.4533 48.4036 45.5 0.560455C43.5467 48.4036 32.2154 134.177 0 134.177C32.2154 134.177 43.5467 219.949 45.5 267.793C47.4533 219.949 58.7846 134.177 91 134.177Z"
        fill="currentColor"
      />
    </svg>
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
          className="animate-heart stroke-foreground"
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
