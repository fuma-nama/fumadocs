import { describe, expect, test } from 'vitest';
import type { ComponentType, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';
import type * as PageTree from 'fumadocs-core/page-tree';
import { DocsLayout as RadixDocs } from '../src/layouts/docs';
import { DocsLayout as RadixNotebook } from '../src/layouts/notebook';
import { DocsLayout as RadixGlass } from '../src/layouts/glass';
import { DocsLayout as BaseDocs } from '@fumadocs/base-ui/layouts/docs';
import { DocsLayout as BaseNotebook } from '@fumadocs/base-ui/layouts/notebook';
import { DocsLayout as BaseGlass } from '@fumadocs/base-ui/layouts/glass';
import { DocsLayout as BaseSpacious } from '@fumadocs/base-ui/layouts/spacious';
import type { AIChatOptions } from '../src/layouts/shared';

const tree: PageTree.Root = { name: 'Docs', children: [] };

type Layout = ComponentType<{ tree: PageTree.Root; aiChat?: AIChatOptions; children: ReactNode }>;

function askAIButtons(Layout: Layout, trigger: boolean) {
  const html = renderToStaticMarkup(
    <FrameworkProvider
      usePathname={() => '/docs'}
      useParams={() => ({})}
      useRouter={() => ({ push() {}, refresh() {} })}
    >
      <Layout tree={tree} aiChat={{ open: false, onOpenChange() {}, panel: 'chat', trigger }}>
        page
      </Layout>
    </FrameworkProvider>,
  );
  return html.split('Ask AI').length - 1;
}

describe('aiChat.trigger', () => {
  test.each<[string, Layout]>([
    ['Radix UI Docs', RadixDocs as Layout],
    ['Radix UI Notebook', RadixNotebook as Layout],
    ['Base UI Docs', BaseDocs as Layout],
    ['Base UI Notebook', BaseNotebook as Layout],
  ])('%s renders a floating Ask AI button only with `trigger`', (_, Layout) => {
    expect(askAIButtons(Layout, false)).toBe(0);
    expect(askAIButtons(Layout, true)).toBe(1);
  });

  // Spacious renders its own button in the page header, not in the layout
  test.each<[string, Layout, number]>([
    ['Radix UI Glass', RadixGlass as Layout, 1],
    ['Base UI Glass', BaseGlass as Layout, 1],
    ['Base UI Spacious', BaseSpacious as Layout, 0],
  ])('%s ignores `trigger`, it has its own button', (_, Layout, own) => {
    expect(askAIButtons(Layout, false)).toBe(own);
    expect(askAIButtons(Layout, true)).toBe(own);
  });
});
