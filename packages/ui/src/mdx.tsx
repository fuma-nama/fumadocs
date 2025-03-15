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
import { CodeBlock, Pre } from '@/components/codeblock';

function Image(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <NextImage
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
      {...(props as ImageProps)}
      className={cn('rounded-lg', props.className)}
    />
  );
}

function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative overflow-auto">
      <table {...props} />
    </div>
  );
}

const defaultMdxComponents = {
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <CodeBlock {...props}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  ),
  Card,
  Cards,
  a: Link as FC<AnchorHTMLAttributes<HTMLAnchorElement>>,
  img: Image,
  h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h1" {...props} />
  ),
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h2" {...props} />
  ),
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h3" {...props} />
  ),
  h4: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h4" {...props} />
  ),
  h5: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h5" {...props} />
  ),
  h6: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h6" {...props} />
  ),
  table: Table,
  Callout,
};

export const createRelativeLink: typeof import('./mdx.server').createRelativeLink =
  () => {
    throw new Error(
      '`createRelativeLink` is only supported in Node.js environment',
    );
  };

export { defaultMdxComponents as default };
