'use client';
import type { ComponentProps, FC, ReactNode } from 'react';
import { createContext, use, useMemo } from 'react';
import type { StaticImport } from 'next/dist/shared/lib/get-img-props';

export interface ImageProps extends Omit<ComponentProps<'img'>, 'src'> {
  sizes?: string;

  /**
   * Next.js Image component has other allowed type for `src`
   */
  src?: string | StaticImport;

  /**
   * priority of image (from Next.js)
   */
  priority?: boolean;
}

interface LinkProps extends ComponentProps<'a'> {
  prefetch?: boolean;
}

export interface Router {
  push: (url: string) => void;
  refresh: () => void;
}

export interface Framework {
  usePathname: () => string;
  useParams: () => Record<string, string | string[]>;
  useRouter: () => Router;

  Link?: FC<
    ComponentProps<'a'> & {
      prefetch?: boolean;
    }
  >;

  Image?: FC<ImageProps>;
}

const notImplemented = () => {
  throw new Error(
    'You need to wrap your application inside `FrameworkProvider`.',
  );
};

const FrameworkContext = createContext<Framework>({
  useParams: notImplemented,
  useRouter: notImplemented,
  usePathname: notImplemented,
});

export function FrameworkProvider({
  Link,
  useRouter,
  useParams,
  usePathname,
  Image,
  children,
}: Framework & { children: ReactNode }) {
  const framework = useMemo(
    () => ({
      usePathname,
      useRouter,
      Link,
      Image,
      useParams,
    }),
    [Link, usePathname, useRouter, useParams, Image],
  );

  return <FrameworkContext value={framework}>{children}</FrameworkContext>;
}

export function usePathname() {
  return use(FrameworkContext).usePathname();
}

export function useRouter() {
  return use(FrameworkContext).useRouter();
}

export function useParams() {
  return use(FrameworkContext).useParams();
}

export function Image(props: ImageProps) {
  const { Image } = use(FrameworkContext);
  if (!Image) {
    const { src, alt, priority, ...rest } = props;

    return (
      <img
        alt={alt}
        src={src as string}
        fetchPriority={priority ? 'high' : 'auto'}
        {...rest}
      />
    );
  }

  return <Image {...props} />;
}

export function Link(props: LinkProps) {
  const { Link } = use(FrameworkContext);
  if (!Link) {
    const { href, prefetch: _, ...rest } = props;
    return <a href={href} {...rest} />;
  }

  return <Link {...props} />;
}
