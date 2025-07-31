'use client';
import { PropsWithChildren } from 'react';
import { WakuProvider } from 'fumadocs-core/framework/waku';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '../source';

export const Provider = ({ children }: PropsWithChildren) => {
  return (
    <WakuProvider>
      <RootProvider>
        <DocsLayout tree={source.pageTree}>{children}</DocsLayout>
      </RootProvider>
    </WakuProvider>
  );
};
