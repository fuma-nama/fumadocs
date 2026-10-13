'use client';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import * as Page from 'fumadocs-ui/layouts/docs/page';
import { createTree, DemoPage, getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/docs';
const tree = createTree(base);

export interface DocsLayoutPreviewProps extends PreviewProps {
  tabMode?: DocsLayoutProps['tabMode'];
  sidebar?: Pick<NonNullable<DocsLayoutProps['sidebar']>, 'collapsible'>;
}

export function DocsLayoutPreview(props: DocsLayoutPreviewProps) {
  return (
    <DocsLayout {...getLayoutOptions(base, props)} tree={tree}>
      <DemoPage tree={tree} components={Page} />
    </DocsLayout>
  );
}
