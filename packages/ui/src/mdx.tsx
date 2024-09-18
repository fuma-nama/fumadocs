import Link from 'fumadocs-core/link';
import type {
  AnchorHTMLAttributes,
  FC,
  HTMLAttributes,
  ImgHTMLAttributes,
  TableHTMLAttributes,
} from 'react';
import NextImage from 'next/image';
import type { ImageProps } from 'next/image';
import { Card, Cards } from '@/components/card';
import { Callout } from '@/components/callout';
import { Heading } from '@/components/heading';
import { cn } from '@/utils/cn';

declare const { Pre }: typeof import('./mdx.client');

function Image(props: ImgHTMLAttributes<HTMLImageElement>): React.ReactElement {
  return (
    <NextImage
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
      {...(props as ImageProps)}
      className={cn('rounded-lg', props.className)}
    />
  );
}

function Table(
  props: TableHTMLAttributes<HTMLTableElement>,
): React.ReactElement {
  return (
    <div className="relative overflow-auto">
      <table {...props} />
    </div>
  );
}

const defaultMdxComponents = {
  pre: Pre as FC<HTMLAttributes<HTMLPreElement>>,
  Card,
  Cards,
  a: Link as FC<AnchorHTMLAttributes<HTMLAnchorElement>>,
  img: Image,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h1" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h2" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h3" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h4" {...props} />
  ),
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h5" {...props} />
  ),
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h6" {...props} />
  ),
  table: Table,
  Callout,
};

/**
 * **Server Component Only**
 *
 * Sometimes, if you directly pass a client component to MDX Components, it will throw an error
 *
 * To solve this, you can re-create the component in a server component like: `(props) => <Component {...props} />`
 *
 * This function does that for you
 *
 * @param c - MDX Components
 * @returns MDX Components with re-created client components
 */
export function createComponents<
  Components extends Record<string, FC<unknown>>,
>(c: Components): Components {
  const mapped = Object.entries(c).map(([k, V]) => {
    // Client components are empty objects
    return [
      k,
      Object.keys(V).length === 0 ? (props: object) => <V {...props} /> : V,
    ];
  });

  return Object.fromEntries(mapped) as Components;
}

export { defaultMdxComponents as default };
