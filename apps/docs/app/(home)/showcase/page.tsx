import { PlusIcon } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { createMetadata } from '@/utils/metadata';
import NextFAQImage from '@/public/showcases/next-faq.png';
import YeecordImage from '@/public/showcases/yeecord.png';
import NuqsImage from '@/public/showcases/nuqs.jpg';
import FrameGround from '@/public/showcases/frameground.png';
import Xlog from '@/public/showcases/xlog.png';
import Briefkasten from '@/public/showcases/briefkasten.png';
import Turbo from '@/public/showcases/turbo.png';
import Spot from '@/public/spot.png';

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
      image: Turbo,
      name: 'Turbo',
      url: 'https://turbo.build',
    },
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
    {
      image: Briefkasten,
      name: 'Briefkasten Docs',
      url: 'https://docs.briefkastenhq.com',
    },
    {
      image: Xlog,
      name: 'xlog.systems',
      url: 'https://www.xlog.systems',
    },
  ];

  return (
    <main className="pb-16">
      <div className="absolute inset-0 z-[-1] select-none overflow-hidden opacity-30">
        <Image
          alt="spot"
          src={Spot}
          sizes="100vw"
          className="size-full min-w-[800px] max-w-container"
          priority
        />
      </div>
      <div className="container my-12 text-center">
        <h1 className="mb-4 text-3xl font-semibold leading-snug md:text-5xl md:leading-snug">
          Cool Websites
          <br />
          Made with Fumadocs
        </h1>
        <p className="text-muted-foreground">
          Nice open-source projects powered by Fumadocs
        </p>
        <div className="mt-6">
          <a
            href="https://github.com/fuma-nama/fumadocs/discussions/30"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants())}
          >
            <PlusIcon className="me-2 size-4" />
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
        className="relative flex aspect-[1.91/1] flex-col overflow-hidden rounded-2xl border transition-all hover:border-primary/30"
      >
        <Image
          alt="Preview"
          src={image}
          placeholder="blur"
          fill
          sizes="100vw, (min-width: 750px) 500px"
        />
        <p className="z-[2] mt-auto bg-black/50 p-4 text-sm font-medium text-white backdrop-blur-sm">
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
      className="flex aspect-[1.91/1] flex-col rounded-2xl border border-transparent p-8 text-center shadow-primary/20 transition-all hover:shadow-primary/30"
      style={{
        backgroundImage:
          'radial-gradient(closest-side at center, hsl(var(--background)) 89%, transparent 90%),' +
          'conic-gradient(from 0deg, hsl(var(--background)) 120deg, hsl(var(--primary)), hsl(var(--background)) 240deg),' +
          'linear-gradient(to right bottom, black, rgb(200,200,200), black)',
        backgroundOrigin: 'border-box',
        boxShadow: 'inset 0px 12px 28px 4px var(--tw-shadow-color)',
        backgroundClip: 'padding-box, padding-box, border-box',
      }}
    >
      <p className="mb-6 text-muted-foreground">{new URL(url).hostname}</p>
      <p className="text-3xl font-semibold">{name}</p>
    </a>
  );
}
