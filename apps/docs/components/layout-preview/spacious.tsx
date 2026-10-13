'use client';
import { DocsLayout } from 'fumadocs-ui/layouts/spacious';
import * as Page from 'fumadocs-ui/layouts/spacious/page';
import { createTree, DemoPage, getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/spacious';
const tree = createTree(base);

export function SpaciousLayoutPreview(props: PreviewProps) {
  return (
    <DocsLayout {...getLayoutOptions(base, props)} tree={tree}>
      <DemoPage tree={tree} components={Page} />
    </DocsLayout>
  );
}
