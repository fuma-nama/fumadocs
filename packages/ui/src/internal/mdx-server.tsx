import Link from 'next-docs-zeta/link';
import NextImage, { type ImageProps } from 'next/image';
import type {
  HTMLAttributes,
  ImgHTMLAttributes,
  TableHTMLAttributes,
} from 'react';
import { Card, Cards } from '@/components/mdx/card';
import { Heading } from '@/components/mdx/heading';
import { cn } from '@/utils/cn';
import { defaultImageSizes } from '@/utils/config';

function Image(props: ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  return <NextImage sizes={defaultImageSizes} {...(props as ImageProps)} />;
}

function Table(props: TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return (
    <div className="relative overflow-auto">
      <table {...props} />
    </div>
  );
}

function MDXContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('prose', className)} {...props} />;
}

const defaultMdxComponents = {
  Card,
  Cards,
  a: Link,
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
};

export {
  defaultMdxComponents as default,
  Link,
  defaultImageSizes,
  Heading,
  Card,
  Cards,
  Image,
  Table,
  MDXContent,
};
