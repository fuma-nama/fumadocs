'use client';
import { DocsLayout } from 'fumadocs-ui/layouts/flux';
import * as Page from 'fumadocs-ui/layouts/flux/page';
import { createTree, DemoPage, getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/flux';
const tree = createTree(base);

export function FluxLayoutPreview(props: PreviewProps) {
  return (
    <DocsLayout {...getLayoutOptions(base, props)} tree={tree}>
      <DemoPage tree={tree} components={Page} />
    </DocsLayout>
  );
}
