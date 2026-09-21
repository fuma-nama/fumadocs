import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameworkProvider } from 'fumadocs-core/framework';

// The popover only mounts its content when open, so stand it in with plain
// elements: the assertions below are about the prompt URLs in the items, not
// the popover. `vi.mock` is hoisted, so each factory is written out in place.
vi.mock('../src/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverClose: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
const { ViewOptionsPopover } = await import('../src/layouts/shared/page-actions');

function promptUrl(html: string): string | null {
  // The Claude item carries the prompt as `q`; every assistant item shares it.
  const match = /href="https:\/\/claude\.ai\/new\?([^"]+)"/.exec(html);
  if (!match) return null;
  const q = new URLSearchParams(match[1]!.replaceAll('&amp;', '&')).get('q');
  const url = /^Read (\S+), I want to ask questions about it\.$/.exec(q ?? '');
  return url?.[1] ?? null;
}

describe('ViewOptionsPopover', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function render(props: { pageUrl?: string } = {}) {
    return renderToStaticMarkup(
      <FrameworkProvider
        usePathname={() => '/docs/ui/page'}
        useParams={() => ({})}
        useRouter={() => ({ push: vi.fn(), refresh: vi.fn() })}
      >
        <ViewOptionsPopover markdownUrl="/docs/ui/page.mdx" {...props} />
      </FrameworkProvider>,
    );
  }

  test('names the page by the URL the reader is on, base path included', () => {
    // Next's `usePathname()` returns `/docs/ui/page` for a site mounted under
    // `/base`; the reader's URL is the one an assistant can fetch.
    vi.stubGlobal('window', {
      location: { href: 'https://example.com/base/docs/ui/page?utm=x#section' },
    });
    expect(promptUrl(render())).toBe('https://example.com/base/docs/ui/page');
  });

  test('falls back to the router pathname without a window', () => {
    expect(typeof window).toBe('undefined');
    expect(promptUrl(render())).toBe('/docs/ui/page');
  });

  test('prefers an explicit pageUrl', () => {
    vi.stubGlobal('window', { location: { href: 'https://example.com/base/docs/ui/page' } });
    expect(promptUrl(render({ pageUrl: 'https://docs.example.com/ui/page' }))).toBe(
      'https://docs.example.com/ui/page',
    );
  });
});
