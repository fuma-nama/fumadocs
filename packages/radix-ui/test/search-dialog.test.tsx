import { expect, test, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';
import * as radix from '../src/components/dialog/search';
import * as base from '@fumadocs/base-ui/components/dialog/search';
import { useSearchContext } from '@fumadocs/base-ui/contexts/search';

function BaseSearchDialog(props: Omit<ComponentProps<typeof base.SearchDialog>, 'dialogHandle'>) {
  return <base.SearchDialog {...props} dialogHandle={useSearchContext().dialogHandle} />;
}

test.each([
  ['Radix UI', radix.SearchDialog, radix.SearchDialogList],
  ['Base UI', BaseSearchDialog, base.SearchDialogList],
] as const)(
  '%s: a failed search keeps the previous results',
  (_, SearchDialog, SearchDialogList) => {
    const html = renderToStaticMarkup(
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
          data={{
            query: 'first',
            items: [
              {
                id: 'first',
                type: 'page',
                url: '/first',
                content: 'Result of first',
                hastContent: {
                  type: 'root',
                  children: [{ type: 'text', value: 'Result of first' }],
                },
              },
            ],
          }}
          error={new Error('Unauthorized')}
        >
          <SearchDialogList />
        </SearchDialog>
      </FrameworkProvider>,
    );

    expect(html).toContain('Search failed');
    expect(html).toContain('Result of first');
  },
);
