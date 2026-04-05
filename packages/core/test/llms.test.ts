import { expect, test } from 'vitest';
import { llms, loader } from '@/source';
import { source } from './fixtures/page-trees/basic';

test('llms: renders H1 title and page index', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
  ).index();

  expect(output).toContain('# Docs');
  expect(output).toContain('- [Hello](/docs/test)');
});

test('llms: renders description blockquote after title', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      description: 'A knowledge base for humans and AI agents.',
    },
  ).index();

  const lines = output.split('\n');
  expect(lines[0]).toBe('# Docs');
  expect(lines[1]).toBe('');
  expect(lines[2]).toBe('> A knowledge base for humans and AI agents.');
  expect(lines[3]).toBe('');
});

test('llms: renders before-index sections between description and index', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      description: 'Short description.',
      sections: [
        {
          heading: 'Access patterns',
          content: '- Send `Accept: text/markdown` to any URL',
        },
      ],
    },
  ).index();

  const descIdx = output.indexOf('> Short description.');
  const sectionIdx = output.indexOf('## Access patterns');
  const pageIdx = output.indexOf('- [Hello]');

  expect(descIdx).toBeGreaterThan(-1);
  expect(sectionIdx).toBeGreaterThan(descIdx);
  expect(pageIdx).toBeGreaterThan(sectionIdx);
  expect(output).toContain('- Send `Accept: text/markdown` to any URL');
});

test('llms: before-index is the default section position', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      sections: [{ heading: 'Note', content: 'Body text.' }],
    },
  ).index();

  const sectionIdx = output.indexOf('## Note');
  const pageIdx = output.indexOf('- [Hello]');
  expect(sectionIdx).toBeGreaterThan(-1);
  expect(sectionIdx).toBeLessThan(pageIdx);
});

test('llms: after-index sections render after the page tree', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      sections: [
        {
          heading: 'Footer',
          content: 'See LICENSE.',
          position: 'after-index',
        },
      ],
    },
  ).index();

  const pageIdx = output.indexOf('- [Hello]');
  const footerIdx = output.indexOf('## Footer');
  expect(footerIdx).toBeGreaterThan(pageIdx);
  expect(output).toContain('See LICENSE.');
});

test('llms: multiple sections with mixed positions', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
    {
      sections: [
        { heading: 'Intro', content: 'Intro body.' },
        {
          heading: 'License',
          content: 'MIT.',
          position: 'after-index',
        },
        { heading: 'Before', content: 'Before body.', position: 'before-index' },
      ],
    },
  ).index();

  const introIdx = output.indexOf('## Intro');
  const beforeIdx = output.indexOf('## Before');
  const pageIdx = output.indexOf('- [Hello]');
  const licenseIdx = output.indexOf('## License');

  expect(introIdx).toBeGreaterThan(-1);
  expect(beforeIdx).toBeGreaterThan(introIdx);
  expect(pageIdx).toBeGreaterThan(beforeIdx);
  expect(licenseIdx).toBeGreaterThan(pageIdx);
});

test('llms: omits description and sections when not provided (back-compat)', () => {
  const output = llms(
    loader({
      baseUrl: '/docs',
      source,
    }),
  ).index();

  expect(output).not.toContain('> ');
  expect(output).not.toContain('##');
  expect(output).toContain('# Docs');
  expect(output).toContain('- [Hello]');
});
