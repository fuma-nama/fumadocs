'use client';

import { cva } from 'class-variance-authority';
import { GithubIcon, StarsIcon } from 'lucide-react';
import { Nav as OriginalNav } from 'next-docs-ui/nav';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { modes } from '@/utils/modes';

const item = cva(
  'rounded-md px-2 py-1 transition-colors hover:text-accent-foreground',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
      },
    },
  },
);

export function Nav(): JSX.Element {
  const { mode } = useParams();
  const [isDown, setIsDown] = useState(true);

  useEffect(() => {
    const listener = (): void => {
      if (!window.document.scrollingElement) return;

      setIsDown(window.document.scrollingElement.scrollTop < 30);
    };

    listener();
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, []);

  return (
    <OriginalNav
      title={
        <>
          <StarsIcon className="h-5 w-5" fill="currentColor" />
          <span className="ml-1.5 font-semibold max-sm:hidden">Next Docs</span>
        </>
      }
      enableSidebar={modes.some((m) => m.param === mode)}
      links={[
        {
          label: 'Github',
          icon: <GithubIcon />,
          href: 'https://github.com/fuma-nama/next-docs',
          external: true,
        },
      ]}
      items={[
        {
          href: '/showcase',
          children: 'Showcase',
        },
      ]}
      transparent={!mode && isDown}
    >
      <div className="rounded-md border bg-secondary/50 p-1 text-sm text-muted-foreground max-sm:absolute max-sm:left-[50%] max-sm:translate-x-[-50%]">
        {modes.map((m) => (
          <Link
            key={m.param}
            href={`/docs/${m.param}`}
            className={cn(item({ active: mode === m.param }))}
          >
            {m.name.slice('Next Docs '.length)}
          </Link>
        ))}
      </div>
    </OriginalNav>
  );
}
