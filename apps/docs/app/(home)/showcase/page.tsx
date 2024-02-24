import { PlusIcon } from 'lucide-react';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import NextFAQImage from '@/public/showcases/next-faq.png';
import YeecordImage from '@/public/showcases/yeecord.png';
import { cn } from '@/utils/cn';
import { createMetadata } from '@/utils/metadata';
import NuqsImage from '@/public/showcases/nuqs.jpg';
import TypelyticsImage from '@/public/showcases/typelytics.png';

export const metadata = createMetadata({
  title: 'Showcase',
  description: 'Some cool websites using Fumadocs',
  openGraph: {
    url: 'https://fumadocs.vercel.app/showcase',
  },
});

export default function Showcase(): JSX.Element {
  const showcases = [
    [
      NextFAQImage,
      'Next.js Discord Common Questions',
      'https://nextjs-discord-common-questions.joulev.dev',
    ],
    [YeecordImage, 'Yeecord Docs', 'https://yeecord.com'],
    [NuqsImage, 'nuqs', 'https://nuqs.47ng.com'],
    [TypelyticsImage, 'Typelytics', 'https://typelytics.rhyssul.com/'],
  ] as const;

  return (
    <main className="pb-16">
      <svg className="-mb-4 -mt-6 h-[400px] w-full invert dark:invert-0 md:-mt-16">
        <filter id="noiseFilter">
          <feTurbulence type="turbulence" baseFrequency="0.67" numOctaves="2" />
          <feColorMatrix type="saturate" values="0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feComposite in2="SourceGraphic" operator="lighter" />
        </filter>

        <filter id="circleShadow" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="black" />
        </filter>

        <defs>
          <linearGradient id="Gradient1" x1="0" x2="0.5" y1="0" y2="1">
            <stop stopColor="white" offset="20%" />
            <stop stopColor="black" offset="100%" />
          </linearGradient>
        </defs>

        <g width="100%" filter="url(#noiseFilter)">
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgb(100,100,100)" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgb(100,100,100)" />
          <circle
            cx="50%"
            cy="50%"
            r="180"
            stroke="rgb(10,10,10)"
            fill="none"
          />
          <circle
            cx="50%"
            cy="50%"
            r="80"
            fill="url(#Gradient1)"
            fillOpacity="0"
            filter="url(#circleShadow)"
            stroke="rgb(100,100,100)"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="1000;0"
              dur="1s"
              fill="freeze"
            />
            <animate
              begin="800ms"
              attributeName="fill-opacity"
              values="0;1"
              dur="500ms"
              fill="freeze"
            />
          </circle>
        </g>
      </svg>
      <div className="container text-center">
        <h1 className="mb-4 text-3xl font-semibold leading-snug md:text-5xl md:leading-snug">
          Cool Websites
          <br />
          Made with Fumadocs
        </h1>
        <p className="text-muted-foreground">
          Nice open-source projects powered by Fumadocs
        </p>
        <div className="mt-4">
          <a
            href="https://github.com/fuma-nama/fumadocs/discussions/30"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants())}
          >
            <PlusIcon className="mr-2 size-4" />
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
            className="relative overflow-hidden rounded-lg border shadow-lg transition-all hover:border-primary/30 hover:shadow-primary/10"
          >
            <Image
              alt="Preview"
              src={image}
              placeholder="blur"
              className="h-full object-cover"
            />
            <p className="absolute inset-x-0 bottom-0 mt-2 bg-gradient-to-t from-black bg-no-repeat p-6 pt-8 text-sm font-medium text-white">
              {name}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
