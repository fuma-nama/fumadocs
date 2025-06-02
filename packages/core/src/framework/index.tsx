'use client';
import type { ComponentProps, FC, ReactNode } from 'react';
import React from 'react';
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

const FrameworkContext = createContext<Framework>('FrameworkContext', {
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
  const framework = React.useMemo(
    () => ({
      usePathname,
      useRouter,
      Link,
      Image,
      useParams,
    }),
    [Link, usePathname, useRouter, useParams, Image],
  );

  return (
    <FrameworkContext.Provider value={framework}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function usePathname() {
  return FrameworkContext.use().usePathname();
}

export function useRouter() {
  return FrameworkContext.use().useRouter();
}

export function useParams() {
  return FrameworkContext.use().useParams();
}

export function Image(props: ImageProps) {
  const { Image } = FrameworkContext.use();
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
  const { Link } = FrameworkContext.use();
  if (!Link) {
    const { href, prefetch: _, ...rest } = props;
    return <a href={href} {...rest} />;
  }

  return <Link {...props} />;
}

export function createContext<T>(name: string, v?: T) {
  const Context = React.createContext(v);

  return {
    Provider: (props: { value: T; children: ReactNode }) => {
      return (
        <Context.Provider value={props.value}>
          {props.children}
        </Context.Provider>
      );
    },
    use: (errorMessage?: string): Exclude<T, undefined | null> => {
      const value = React.useContext(Context);

      if (!value)
        throw new Error(
          errorMessage ?? `Provider of ${name} is required but missing.`,
        );
      return value as Exclude<T, undefined | null>;
    },
  };
}
