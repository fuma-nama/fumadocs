"use client";

import { docs } from '../../../source.generated';
import { toClientRenderer } from 'fumadocs-mdx/runtime/vite';
import defaultMdxComponents from 'fumadocs-ui/mdx';

const renderer = toClientRenderer(
  docs.doc,
  ({ toc, default: Mdx, frontmatter }) => {
    return (
      <div className="mdx-content">
        <Mdx components={{ ...defaultMdxComponents }} />
      </div>
    );
  },
);

export default function DocsContent({ path }: { path: string }) {
  const Content = renderer[path];
  
  if (!Content) {
    return <div className="p-4 text-red-600">Content not found for path: {path}</div>;
  }
  
  return <Content />;
}