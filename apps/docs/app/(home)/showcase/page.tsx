import { PlusIcon } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import NextFAQImage from '@/public/showcases/next-faq.png';
import YeecordImage from '@/public/showcases/yeecord.png';
import { cn } from '@/utils/cn';
import { createMetadata } from '@/utils/metadata';
import NuqsImage from '@/public/showcases/nuqs.jpg';
import FrameGround from '@/public/showcases/frameground.png';

export const metadata = createMetadata({
  title: 'Showcase',
  description: 'Some cool websites using Fumadocs',
  openGraph: {
    url: 'https://fumadocs.vercel.app/showcase',
  },
});

interface ShowcaseObject {
  image?: StaticImageData;
  name: string;
  url: string;
}

export default function Showcase(): React.ReactElement {
  const showcases: ShowcaseObject[] = [
    {
      image: NextFAQImage,
      name: 'Next.js Discord Common Questions',
      url: 'https://nextjs-faq.com',
    },
    {
      image: YeecordImage,
      name: 'Yeecord Docs',
      url: 'https://yeecord.com',
    },
    { image: NuqsImage, name: 'nuqs', url: 'https://nuqs.47ng.com' },
    {
      name: 'Typelytics',
      url: 'https://typelytics.rhyssul.com',
    },
    {
      image: FrameGround,
      name: 'FrameGround',
      url: 'https://docs.frameground.tech',
    },
    {
      name: "RUNFUNRUN's Blog",
      url: 'https://www.runfunrun.tech',
    },
  ];

  return (
    <main className="pb-16">
      <svg className="-mb-4 -mt-6 h-[400px] w-full invert dark:invert-0 md:-mt-16">
        <filter id="noiseFilter">
          <feTurbulence type="turbulence" baseFrequency="0.67" numOctaves="1" />
          <feColorMatrix type="saturate" values="0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feComposite in2="SourceGraphic" operator="lighter" />
        </filter>

        <filter id="circleShadow" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="4" floodColor="black" />
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
            stroke="rgb(50,50,50)"
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
        {showcases.map((showcase) => (
          <ShowcaseItem key={showcase.url} {...showcase} />
        ))}
      </div>
    </main>
  );
}

function ShowcaseItem({
  name,
  url,
  image,
}: ShowcaseObject): React.ReactElement {
  if (image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="relative flex aspect-video flex-col rounded-lg border shadow-md transition-all hover:border-primary/30"
      >
        <Image
          alt="Preview"
          src={image}
          placeholder="blur"
          className="absolute size-full rounded-lg object-cover"
        />
        <p className="z-[2] mt-auto rounded-b-lg bg-gradient-to-t from-black p-6 pt-8 text-sm font-medium text-white">
          {name}
        </p>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex aspect-video flex-col rounded-lg border bg-gradient-to-br from-card to-primary/30 p-8 shadow-md transition-all hover:bg-accent/80"
    >
      <p className="mb-4 text-muted-foreground">{new URL(url).hostname}</p>
      <p className="text-xl font-semibold">{name}</p>
    </a>
  );
}
