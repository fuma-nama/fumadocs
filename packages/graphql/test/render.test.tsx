import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { createGraphQLPage } from '@/ui';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const sdl = fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8');

const GraphQLPage = createGraphQLPage({
  // avoid async highlighting in tests
  components: {
    CodeBlock({ lang, code }) {
      return (
        <pre data-lang={lang}>
          <code>{code}</code>
        </pre>
      );
    },
  },
  typeLinks: (name) => `/docs/types/${name}`,
});

describe('render <GraphQLPage />', () => {
  test('operation page', () => {
    const html = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[{ type: 'operation', kind: 'query', name: 'orders' }]}
        showDescription
      />,
    );

    expect(html).toContain('List all orders.');
    expect(html).toContain('Arguments');
    expect(html).toContain('Returns');
    // custom directive callout
    // custom directive callout, rendered as a card with name & arguments
    expect(html).toContain('auth');
    expect(html).toContain('ADMIN');
    // example query codeblock
    expect(html).toContain('query Orders');
    // cross-linking of type references
    expect(html).toContain('/docs/types/Order');
  });

  test('operation page with deprecation', () => {
    const html = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[{ type: 'operation', kind: 'mutation', name: 'legacyCreateOrder' }]}
        showDescription
      />,
    );

    expect(html).toContain('Deprecated');
    expect(html).toContain('createOrder');
  });

  test('object type page', () => {
    const html = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[{ type: 'type', kind: 'object', name: 'Customer' }]}
        showDescription
      />,
    );

    expect(html).toContain('A registered customer.');
    expect(html).toContain('Implements');
    expect(html).toContain('Fields');
    for (const field of ['name', 'email', 'contact', 'orders']) {
      expect(html).toContain(field);
    }
  });

  test('operation page with playground', () => {
    const PageWithPlayground = createGraphQLPage({
      components: {
        CodeBlock({ lang, code }) {
          return (
            <pre data-lang={lang}>
              <code>{code}</code>
            </pre>
          );
        },
      },
      playground: {
        url: 'https://api.example.com/graphql',
      },
    });

    const html = renderToString(
      <PageWithPlayground
        payload={{ sdl }}
        items={[{ type: 'operation', kind: 'query', name: 'orders' }]}
        showDescription
      />,
    );

    expect(html).toContain('https://api.example.com/graphql');
    expect(html).toContain('Run');
    expect(html).toContain('POST');

    // no playground without url/fetcher/render
    const withoutPlayground = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[{ type: 'operation', kind: 'query', name: 'orders' }]}
        showDescription
      />,
    );
    expect(withoutPlayground).not.toContain('Run');
  });

  test('enum, union, input and scalar pages', () => {
    const html = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[
          { type: 'type', kind: 'enum', name: 'OrderStatus' },
          { type: 'type', kind: 'union', name: 'SearchResult' },
          { type: 'type', kind: 'input', name: 'OrderFilter' },
          { type: 'type', kind: 'scalar', name: 'DateTime' },
        ]}
        showTitle
        showDescription
      />,
    );

    // enum values with deprecation
    expect(html).toContain('SHIPPED');
    expect(html).toContain('CANCELLED');
    // union members
    expect(html).toContain('Possible types');
    // input field with default value
    expect(html).toContain('PENDING');
    // scalar specification URL
    expect(html).toContain('https://scalars.graphql.org/andimarek/date-time');
  });
});
