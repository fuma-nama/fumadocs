'use client';

import type { HTMLAttributes } from 'react';
import { Pre } from '@/internal/mdx-client';
import serverComponents, {
  Card,
  Cards,
  defaultImageSizes,
  Heading,
  Image,
  Link,
  MDXContent,
  Table,
} from '@/internal/mdx-server';

const defaultMdxComponents = {
  pre: (p: HTMLAttributes<HTMLPreElement>) => <Pre {...p} />,
  ...serverComponents,
};

export {
  defaultMdxComponents as default,
  Pre,
  Card,
  Cards,
  Heading,
  Image,
  Link,
  MDXContent,
  Table,
  defaultImageSizes,
};
