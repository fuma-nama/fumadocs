import { describe, expect, it } from 'vitest';
import { resolvePlugins, type Plugin } from '@/plugin';

function names(plugins: Plugin[]) {
  return plugins.map((plugin) => plugin.name);
}

describe('resolvePlugins', () => {
  it('flattens nested options and skips falsy ones', () => {
    const plugins = resolvePlugins(
      [{ name: 'a' }, false, [{ name: 'b' }, null, [undefined, { name: 'c' }]]],
      [],
    );

    expect(names(plugins)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by enforce and keeps the order otherwise', () => {
    const plugins = resolvePlugins(
      [
        { name: 'a' },
        { name: 'post', enforce: 'post' },
        { name: 'b' },
        { name: 'pre', enforce: 'pre' },
      ],
      [{ name: 'preset' }, { name: 'preset-pre', enforce: 'pre' }],
    );

    expect(names(plugins)).toEqual(['pre', 'preset-pre', 'a', 'b', 'preset', 'post']);
  });

  it('adds the preset plugins that no plugin replaces', () => {
    const plugins = resolvePlugins(
      [{ name: 'sitemap' }, { name: 'my-search', provides: ['search'] }],
      [
        { name: 'sitemap', enforce: 'pre' },
        { name: 'orama-search', provides: ['search'] },
        { name: 'takumi', provides: ['og-image'] },
      ],
    );

    expect(names(plugins)).toEqual(['sitemap', 'my-search', 'takumi']);
    expect(plugins[0].enforce).toBeUndefined();
  });

  it('throws when two plugins provide a capability', () => {
    expect(() =>
      resolvePlugins(
        [
          { name: 'flexsearch', provides: ['search'] },
          { name: 'orama-search', provides: ['search'] },
        ],
        [],
      ),
    ).toThrow('"flexsearch" and "orama-search" both provide "search"');

    expect(() =>
      resolvePlugins(
        [],
        [
          { name: 'flexsearch', provides: ['search'] },
          { name: 'orama-search', provides: ['search'] },
        ],
      ),
    ).toThrow('"flexsearch" and "orama-search" both provide "search"');
  });
});
