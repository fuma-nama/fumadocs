import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';
import type { SearchResult } from 'fumadocs-core/search/client';
import { SearchDialog, SearchDialogList } from '../src/components/dialog/search';

const data: SearchResult = {
  query: 'first',
  items: [
    {
      id: '/docs/first',
      type: 'page',
      url: '/docs/first',
      content: 'Result of first',
      hastContent: { type: 'root', children: [{ type: 'text', value: 'Result of first' }] },
    },
  ],
};

function renderList(error?: Error) {
  return renderToStaticMarkup(
    <FrameworkProvider
      usePathname={() => '/'}
      useParams={() => ({})}
      useRouter={() => ({ push: vi.fn(), refresh: vi.fn() })}
    >
      <SearchDialog
        open
        onOpenChange={() => {}}
        search="second"
        onSearchChange={() => {}}
        data={data}
        error={error}
      >
        <SearchDialogList />
      </SearchDialog>
    </FrameworkProvider>,
  );
}

test('shows the results of the last search', () => {
  const html = renderList();
  expect(html).toContain('Result of first');
  expect(html).not.toContain('Search failed');
});

test('a failed search shows an error, not the results of the search before', () => {
  const html = renderList(new Error('Unauthorized'));
  expect(html).toContain('Search failed');
  expect(html).not.toContain('Result of first');
});
