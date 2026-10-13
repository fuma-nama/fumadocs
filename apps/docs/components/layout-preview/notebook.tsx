'use client';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/notebook';
import * as Page from 'fumadocs-ui/layouts/notebook/page';
import { createTree, DemoPage, getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/notebook';
const tree = createTree(base);

export interface NotebookLayoutPreviewProps extends PreviewProps {
  nav?: PreviewProps['nav'] & Pick<NonNullable<DocsLayoutProps['nav']>, 'mode'>;
  tabMode?: DocsLayoutProps['tabMode'];
  sidebar?: Pick<NonNullable<DocsLayoutProps['sidebar']>, 'collapsible'>;
}

export function NotebookLayoutPreview(props: NotebookLayoutPreviewProps) {
  return (
    <DocsLayout {...getLayoutOptions(base, props)} tree={tree}>
      <DemoPage tree={tree} components={Page} />
    </DocsLayout>
  );
}
