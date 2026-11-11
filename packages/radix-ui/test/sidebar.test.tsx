import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';
import * as radix from '../src/components/sidebar/base';
import * as base from '@fumadocs/base-ui/components/sidebar/base';

test.each([
  ['Radix UI', radix],
  ['Base UI', base],
] as const)(
  '%s: the active sidebar item is marked as the current page',
  (_, { SidebarProvider, SidebarItem }) => {
    const html = renderToStaticMarkup(
      <FrameworkProvider
        usePathname={() => '/docs/b'}
        useParams={() => ({})}
        useRouter={() => ({ push() {}, refresh() {} })}
      >
        <SidebarProvider>
          <SidebarItem href="/docs/a">A</SidebarItem>
          <SidebarItem href="/docs/b" active>
            B
          </SidebarItem>
        </SidebarProvider>
      </FrameworkProvider>,
    );

    expect(html).toContain('<a href="/docs/b" data-active="true" aria-current="page"');
    expect(html).toContain('<a href="/docs/a" data-active="false"');
    expect(html.match(/aria-current/g)).toHaveLength(1);
  },
);
