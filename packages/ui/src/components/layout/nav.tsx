'use client';
import Link from 'fumadocs-core/link';
import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/utils/cn';

export interface NavBoxProps {
  /**
   * When to use transparent navbar
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';
}

export interface TitleProps {
  title?: ReactNode;

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;
}

export function NavBox({
  transparentMode = 'none',
  ...props
}: NavBoxProps & HTMLAttributes<HTMLElement>) {
  const [transparent, setTransparent] = useState(transparentMode !== 'none');

  useEffect(() => {
    if (transparentMode !== 'top') return;

    const listener = (): void => {
      setTransparent(window.scrollY < 10);
    };

    listener();
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [transparentMode]);

  return (
    <header
      {...props}
      className={cn(
        'sticky top-0 z-50 h-16 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'border-foreground/10 bg-background/80 backdrop-blur-md',
        props.className,
      )}
    />
  );
}

export function Title({ title, url = '/' }: TitleProps) {
  return (
    <Link
      href={url}
      className="inline-flex items-center gap-2.5 font-semibold [&_svg]:size-5"
    >
      {title}
    </Link>
  );
}
