import { expect, test } from 'vitest';
import { llms, loader } from '@/source';
import { source } from './fixtures/page-trees/basic';

test('llms: baseline — no transform (back-compat)', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
  ).index();

  expect(output).toContain('# Docs');
  expect(output).toContain('- [Hello](/docs/test)');
});

test('llms: transform receives default output and returns final string', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      transform: (defaultOutput) =>
        `${defaultOutput}\n\n## License\n\nMIT.\n`,
    },
  ).index();

  expect(output).toContain('# Docs');
  expect(output).toContain('- [Hello](/docs/test)');
  expect(output.trimEnd().endsWith('MIT.')).toBe(true);
});

test('llms: transform can inject description blockquote per llms.txt spec', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      transform: (defaultOutput) =>
        defaultOutput.replace(
          /^# (.+)\n/m,
          '# $1\n\n> A knowledge base for humans and AI agents.\n',
        ),
    },
  ).index();

  expect(output).toMatch(/^# Docs\n\n> A knowledge base/);
});

test('llms: transform receives Context with lang on i18n loaders', () => {
  let seenLang: string | undefined = 'sentinel';
  llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      transform: (defaultOutput, ctx) => {
        seenLang = ctx.lang;
        return defaultOutput;
      },
    },
  ).index();

  // Without i18n config, lang is undefined.
  expect(seenLang).toBeUndefined();
});

test('llms: transform return value is used as-is (can rewrite everything)', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      transform: () => 'replaced entirely',
    },
  ).index();

  expect(output).toBe('replaced entirely');
});
