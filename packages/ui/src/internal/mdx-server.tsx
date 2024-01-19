import Link from 'fumadocs-core/link';
import type { AnchorHTMLAttributes, FC } from 'react';
import { Card, Cards } from '@/mdx/card';
import { Heading } from '@/mdx/heading';
import { Image, Table } from '@/mdx/base';

const defaultMdxComponents = {
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
};

export { defaultMdxComponents as default };
