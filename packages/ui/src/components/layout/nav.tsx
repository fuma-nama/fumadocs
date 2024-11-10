'use client';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { createContext, type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';

export interface NavProviderProps {
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

interface NavContextType {
  isTransparent: boolean;
}

export const NavContext = createContext<NavContextType>({
  isTransparent: false,
});

export function NavProvider({
  transparentMode = 'none',
  children,
}: NavProviderProps & { children: ReactNode }) {
  const [transparent, setTransparent] = useState(transparentMode !== 'none');

  useEffect(() => {
    if (transparentMode !== 'top') return;

    const listener = () => {
      setTransparent(window.scrollY < 10);
    };

    listener();
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [transparentMode]);

  return (
    <NavContext.Provider value={{ isTransparent: transparent }}>
      {children}
    </NavContext.Provider>
  );
}

export function Title({
  title,
  url,
  ...props
}: TitleProps & Omit<LinkProps, 'title'>) {
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
