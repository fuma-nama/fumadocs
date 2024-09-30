'use client';
import Link, { type LinkProps } from 'fumadocs-core/link';
import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';

export interface NavBoxProps {
  /**
   * Use transparent background
   *
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
}: NavBoxProps & HTMLAttributes<HTMLElement>): React.ReactElement {
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
        'sticky top-fd-sidebar-top z-40 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'border-fd-foreground/10 bg-fd-background/80 backdrop-blur-md',
        props.className,
      )}
    />
  );
}

export function Title({
  title,
  url,
  ...props
}: TitleProps & Omit<LinkProps, 'title'>): React.ReactElement {
  const { locale } = useI18n();

  return (
    <Link
      href={url ?? (locale ? `/${locale}` : '/')}
      {...props}
      className={cn(
        'inline-flex items-center gap-2.5 font-semibold',
        props.className,
      )}
    >
      {title}
    </Link>
  );
}
