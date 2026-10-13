'use client';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/glass';
import * as Page from 'fumadocs-ui/layouts/glass/page';
import { createTree, DemoPage, getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/glass';
const tree = createTree(base);

export interface GlassLayoutPreviewProps extends PreviewProps {
  sidebar?: Pick<NonNullable<DocsLayoutProps['sidebar']>, 'collapsible'>;
}

export function GlassLayoutPreview(props: GlassLayoutPreviewProps) {
  return (
    <DocsLayout {...getLayoutOptions(base, props)} tree={tree}>
      <DemoPage tree={tree} components={Page} />
    </DocsLayout>
  );
}
