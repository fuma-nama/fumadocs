'use client';
import React from 'react';
import {
  type ComponentProps,
  type FC,
  type ReactNode,
  useMemo,
  useContext,
} from 'react';
import type { StaticImport } from 'next/dist/shared/lib/get-img-props';

export interface ImageProps extends Omit<ComponentProps<'img'>, 'src'> {
  sizes?: string;

  /**
   * Next.js Image component has other allowed type for `src`
   */
  src?: string | StaticImport;
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

const FrameworkContext = createContext<Framework>('FrameworkContext');

export function FrameworkProvider({
  children,
  ...props
}: Framework & { children: ReactNode }) {
  const framework = useMemo(
    () => ({
      usePathname: props.usePathname,
      useRouter: props.useRouter,
      Link: props.Link,
      Image: props.Image,
      useParams: props.useParams,
    }),
    [
      props.Link,
      props.usePathname,
      props.useRouter,
      props.useParams,
      props.Image,
    ],
  );

  return (
    <FrameworkContext.Provider value={framework}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function useFramework(): Framework {
  return FrameworkContext.use();
}

export function usePathname() {
  return useFramework().usePathname();
}

export function useRouter() {
  return useFramework().useRouter();
}

export function useParams() {
  return useFramework().useParams();
}

export function Image(props: ImageProps) {
  const { Image = 'img' } = useFramework();
  return <Image {...(props as ComponentProps<'img'>)} />;
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
      const value = useContext(Context);

      if (!value)
        throw new Error(
          errorMessage ?? `Provider of ${name} is required but missing.`,
        );
      return value as Exclude<T, undefined | null>;
    },
  };
}
