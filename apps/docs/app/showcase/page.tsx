import { PlusIcon } from 'lucide-react';
import Image from 'next/image';
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

export default function Showcase(): JSX.Element {
  const showcases = [
    [
      NextFAQImage,
      'Next.js Discord Common Questions',
      'https://nextjs-discord-common-questions.joulev.dev',
    ],
    [YeecordImage, 'Yeecord Docs', 'https://yeecord.com'],
  ] as const;
  const maskImage = 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 70%)';

  return (
    <main>
      <div className="relative py-16 text-center">
        <div
          className="absolute inset-0 z-[-1] bg-gradient-to-r from-red-500/20 via-purple-500/50 to-blue-500/20 duration-1000 animate-in fade-in"
          style={{
            maskImage,
            WebkitMaskImage: maskImage,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, hsl(var(--primary)/.4) 1px,transparent 2px,transparent 40px), repeating-linear-gradient(to bottom, hsl(var(--primary)/.4),hsl(var(--primary)/.4) 1px,transparent 2px,transparent 40px)',
            }}
          />
        </div>
        <div className="container">
          <h1 className="mb-4 text-3xl font-semibold lg:text-4xl">Showcase</h1>
          <p className="text-muted-foreground">
            Some cool websites using Next Docs
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
