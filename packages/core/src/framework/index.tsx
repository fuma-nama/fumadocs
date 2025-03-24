'use client';
import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import { map } from 'nanostores';
import { useStore } from '@nanostores/react';

const internal = map<Framework>();

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

const FrameworkContext = createContext<Framework | null>(null);

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

  internal.set(framework);

  return (
    <FrameworkContext.Provider value={framework}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function useFramework(): Framework {
  let ctx = useContext(FrameworkContext);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed
  ctx ??= useStore(internal);
  if (!ctx) throw new Error('Fumadocs requires a `FrameworkProvider` to work.');

  return ctx;
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
