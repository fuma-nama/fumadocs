import { describe, expect, test } from 'vitest';
import type { ComponentType, FC, ReactNode } from 'react';
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

const tree: PageTree.Root = { name: 'Docs', children: [] };

type Layout = ComponentType<{
  tree: PageTree.Root;
  slots?: { skipToContent?: FC | false };
  children: ReactNode;
}>;

function render(Layout: Layout, slots?: { skipToContent: FC | false }) {
  return renderToStaticMarkup(
    <FrameworkProvider
      usePathname={() => '/docs'}
      useParams={() => ({})}
      useRouter={() => ({ push() {}, refresh() {} })}
    >
      <Layout tree={tree} slots={slots}>
        page
      </Layout>
    </FrameworkProvider>,
  );
}

function SkipToMain() {
  return <a href="#main-content">Skip to main content</a>;
}

describe('slots.skipToContent', () => {
  test.each<[string, Layout]>([
    ['Radix UI Docs', RadixDocs],
    ['Radix UI Notebook', RadixNotebook],
    ['Radix UI Glass', RadixGlass],
    ['Base UI Docs', BaseDocs],
    ['Base UI Notebook', BaseNotebook],
    ['Base UI Glass', BaseGlass],
    ['Base UI Spacious', BaseSpacious],
  ])('%s renders, replaces or omits the skip link', (_, Layout) => {
    expect(render(Layout)).toContain('href="#nd-page"');

    const replaced = render(Layout, { skipToContent: SkipToMain });
    expect(replaced).toContain('href="#main-content"');
    expect(replaced).not.toContain('href="#nd-page"');

    expect(render(Layout, { skipToContent: false })).not.toContain('href="#nd-page"');
  });
});
