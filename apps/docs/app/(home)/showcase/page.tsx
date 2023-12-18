import { PlusIcon } from 'lucide-react';
import Image from 'next/image';
import type { SVGAttributes } from 'react';
import { buttonVariants } from '@/components/ui/button';
import NextFAQImage from '@/public/showcases/next-faq.png';
import YeecordImage from '@/public/showcases/yeecord.png';
import { cn } from '@/utils/cn';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Showcase',
  description: 'Some cool websites using Next Docs',
  openGraph: {
    url: 'https://next-docs-zeta.vercel.app/showcase',
  },
});

function StarLogo(props: SVGAttributes<SVGElement>): JSX.Element {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" {...props}>
      <path
        d="M90 0L110.206 62.1885H175.595L122.694 100.623L142.901 162.812L90 124.377L37.0993 162.812L57.3056 100.623L4.40491 62.1885H69.7937L90 0Z"
        fill="url(#linear_primary)"
      />
      <g filter="url(#shadow)">
        <path
          d="M90 21L105.491 68.6778H155.623L115.066 98.1443L130.557 145.822L90 116.356L49.4428 145.822L64.9343 98.1443L24.3771 68.6778H74.5085L90 21Z"
          fill="url(#linear_primary)"
        />
        <path
          d="M90 21.809L105.254 68.7551L105.31 68.9278H105.491H154.853L114.919 97.9421L114.772 98.0489L114.828 98.2216L130.082 145.168L90.1469 116.153L90 116.047L89.8531 116.153L49.9183 145.168L65.172 98.2216L65.2282 98.0489L65.0812 97.9421L25.1465 68.9278H74.5085H74.6902L74.7463 68.7551L90 21.809Z"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="0.5"
        />
      </g>
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="3.5" floodColor="black" />
        </filter>
        <linearGradient
          id="linear_primary"
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="rgb(250,255,100)" />
          <stop offset="0.5" stopColor="rgb(255,150,200)" />
          <stop offset="1" stopColor="rgb(100,205,255)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Showcase(): JSX.Element {
  const showcases = [
    [
      NextFAQImage,
      'Next.js Discord Common Questions',
      'https://nextjs-discord-common-questions.joulev.dev',
    ],
    [YeecordImage, 'Yeecord Docs', 'https://yeecord.com'],
  ] as const;

  return (
    <main className="pb-16">
      <div className="relative -mb-10 pt-12 [mask-image:linear-gradient(to_top,transparent,white_100px)]">
        <div className="absolute inset-0 z-[-1] bg-repeat-gradient-to-br from-blue-500/30 via-transparent to-pink-500/30 to-30% [mask-image:radial-gradient(circle,white,transparent)]" />
        <div className="relative mx-auto w-fit duration-1000 animate-in fade-in slide-in-from-bottom-10 before:absolute before:-inset-32 before:z-[-1] before:bg-gradient-radial before:from-pink-300/40 before:to-transparent before:to-70% before:content-['']">
          <StarLogo />
        </div>
      </div>
      <div className="container text-center">
        <h1 className="mb-4 text-4xl font-semibold leading-snug lg:text-5xl lg:leading-snug">
          Cool Websites
          <br />
          Made with Next Docs
        </h1>
        <p className="text-muted-foreground">
          Nice open-source projects powered by Next Docs
        </p>
        <div className="mt-4">
          <a
            href="https://github.com/fuma-nama/next-docs/discussions/30"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants())}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Your Own
          </a>
        </div>
      </div>

      <div className="container mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {showcases.map(([image, name, href]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="group relative overflow-hidden rounded-lg border shadow-lg transition-all hover:border-primary/30 hover:shadow-primary/10"
          >
            <Image alt="Preview" src={image} placeholder="blur" />
            <p className="absolute inset-x-0 bottom-0 mt-2 bg-gradient-to-t from-black bg-no-repeat p-6 pt-8 text-sm font-medium text-white transition-all group-hover:[background-position-y:50px]">
              {name}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
