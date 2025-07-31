'use client';

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { TableOfContents } from 'fumadocs-core/server';

export const Doc = ({
  title,
  description,
  children,
  toc,
}: {
  title: string | undefined;
  description: string | undefined;
  children: React.ReactNode;
  toc: TableOfContents;
}) => {
  return (
    <DocsPage toc={toc}>
      <DocsTitle>{title}</DocsTitle>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>{children}</DocsBody>
    </DocsPage>
  );
};
