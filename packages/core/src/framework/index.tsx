'use client';
import { type ComponentProps, type FC, type ReactNode, useMemo } from 'react';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

export interface ImageProps extends ComponentProps<'img'> {
  sizes?: string;
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
  return <Image {...props} />;
}

export function createContext<T>(name: string, v?: T) {
  const store = atom(v);

  return {
    Provider: (props: { value: T; children: ReactNode }) => {
      store.set(props.value);
      return props.children;
    },
    use: (errorMessage?: string): Exclude<T, undefined | null> => {
      const value = useStore(store);
      console.log('use', name);

      if (!value)
        throw new Error(
          errorMessage ?? `Provider of ${name} is required but missing.`,
        );
      return value as Exclude<T, undefined | null>;
    },
  };
}
