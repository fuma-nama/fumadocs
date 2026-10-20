import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import type { ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createGraphQLPage } from '@/ui';
import {
  type GraphQLComponents,
  type GraphQLPageProps,
  GraphQLProvider,
} from '@/utils/create-page';
import { OperationProvider } from '@/operation';
import { OperationBar } from '@/ui/operation/bar';
import type { OperationKind } from '@/utils/schema';

const codeUsage = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/ui/components/code-usage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/ui/components/code-usage')>()),
  useCodeUsageId: () => codeUsage.id,
}));

const cwd = fileURLToPath(new URL('./', import.meta.url));
const sdl = fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8');

// avoid async highlighting in tests
function CodeBlock({ lang, code, codeblock }: ComponentProps<GraphQLComponents['CodeBlock']>) {
  return (
    <figure>
      {codeblock?.title && <figcaption>{codeblock.title}</figcaption>}
      <pre data-lang={lang}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

const GraphQLPage = createGraphQLPage({
  components: { CodeBlock },
  typeLinks: (name) => `/docs/types/${name}`,
  operationLinks: (kind, name) => `/docs/${kind}/${name}`,
});

function renderPage(
  items: GraphQLPageProps['items'],
  payload: Partial<GraphQLPageProps['payload']> = {},
): string {
  return renderToString(
    <GraphQLPage payload={{ sdl, ...payload }} items={items} showDescription />,
  );
}

function renderBar(kind: OperationKind, name: string, schema = sdl): string {
  return renderToString(
    <GraphQLProvider
      sdl={schema}
      shiki={defaultShikiFactory}
      links={{ types: { Customer: '/docs/types/Customer' }, operations: {} }}
      components={{
        SchemaUI: () => null,
        Markdown: ({ md }) => md,
        CodeBlock: () => null,
        Heading: () => null,
      }}
    >
      <OperationProvider kind={kind} name={name}>
        <OperationBar />
      </OperationProvider>
    </GraphQLProvider>,
  );
}

/** the text content of HTML */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

afterEach(() => {
  codeUsage.id = null;
});

describe('operation bar', () => {
  test('signature', () => {
    const html = renderBar('query', 'customer');

    expect(text(html)).toBe('QUERYcustomer(id: ID!): Customer');
    // links to the sections explaining them
    expect(html).toMatch(
      /<a href="#arguments" class="group\/argument"><span class="[^"]*">id<\/span><span class="[^"]*">: <!-- -->ID!<\/span><\/a>/,
    );
    expect(html).toMatch(/<a href="#returns" class="[^"]*">Customer<\/a>/);
    // no hover cards, and no links to type pages
    expect(html).not.toContain('<button');
    expect(html).not.toContain('/docs/types/');
  });

  test('deprecated operation', () => {
    expect(renderBar('mutation', 'legacyCreateOrder')).toContain(
      '<span class="line-through">legacyCreateOrder</span>',
    );
  });

  test('directives in a row of the bar', () => {
    const html = renderBar('query', 'orders');

    expect(text(html)).toBe(
      'QUERYorders(filter: OrderFilter): [Order!]!Directives@auth(requires: ADMIN)',
    );
    // the chip opens the definition of directive
    expect(html).toMatch(/aria-haspopup="dialog"[^>]*>@auth<span/);
  });

  test('the width of one-line signature', () => {
    const schema = `
      input SearchFilter { tag: String }
      enum SearchOrder { RELEVANCE NEWEST }
      type Query {
        search(term: String!, first: Int, after: String, filter: SearchFilter, orderBy: SearchOrder, includeArchived: Boolean): [String!]!
      }
    `;
    const html = renderBar('query', 'search', schema);
    const signature = text(html).slice('QUERY'.length);

    expect(signature).toBe(
      'search(term: String!, first: Int, after: String, filter: SearchFilter, orderBy: SearchOrder, includeArchived: Boolean): [String!]!',
    );
    // in characters, plus the padding of six argument names
    expect(html).toContain(`--signature:calc(${signature.length}ch + 3rem)`);
  });
});

describe('render <GraphQLPage />', () => {
  test('operation page', () => {
    const html = renderPage([{ type: 'operation', kind: 'query', name: 'orders' }]);

    expect(html).toContain('List all orders.');
    expect(html).toContain('Arguments');
    // a row for each argument, like the parameters of OpenAPI
    expect(html).toContain('id="arguments.filter"');
    expect(html).toContain('Returns');
    // the operation bar without playground, its directives in a row
    expect(text(html)).toContain(
      'QUERYorders(filter: OrderFilter): [Order!]!Directives@auth(requires: ADMIN)',
    );
    expect(html).toContain('href="#returns"');
    expect(html).toContain('href="#arguments"');
    // the card below explains the return type, the heading doesn't repeat it
    expect(text(html)).not.toContain('[Order!]!Returns');
    expect(text(html)).not.toContain('Returns[Order!]!');
    // popups open the definition of directive and the details of enum values, never types
    const popups = Array.from(html.matchAll(/aria-haspopup="dialog"[^>]*>(.*?)<\/button>/g), (m) =>
      text(m[1]),
    );
    expect(popups).toEqual(['@auth(requires: ADMIN)', 'SHIPPED', 'CANCELLED']);
    expect(html).not.toContain('/docs/types/');
    // no playground without url/fetcher/render
    expect(html).not.toContain('Try in Playground');
  });

  test('deprecated operation', () => {
    // the callout gives the reason, titled unless the badge of title says it
    for (const showTitle of [false, true]) {
      const html = renderToString(
        <GraphQLPage
          payload={{ sdl }}
          items={[{ type: 'operation', kind: 'mutation', name: 'legacyCreateOrder' }]}
          showTitle={showTitle}
        />,
      );

      expect(html.split('>Deprecated<')).toHaveLength(2);
      expect(html).toContain('Use <code>createOrder</code> instead.');
    }
  });

  test('operations with titles', () => {
    const html = renderToString(
      <GraphQLPage
        payload={{ sdl }}
        items={[
          { type: 'operation', kind: 'mutation', name: 'legacyCreateOrder' },
          { type: 'operation', kind: 'mutation', name: 'createOrder' },
        ]}
        showTitle
      />,
    );

    // ids of sections are unique on the page
    expect(html).toContain('id="legacy-create-order"');
    expect(html).toContain('id="legacy-create-order.arguments"');
    expect(html).toContain('id="create-order.arguments"');
  });

  test('generated example', () => {
    const html = renderPage([{ type: 'operation', kind: 'query', name: 'customer' }]);

    expect(html).toContain('Example Request');
    expect(html).toContain('<pre data-lang="graphql"><code>query Customer($id: ID!) {');
    // variables are a code block of their own, titled
    expect(text(html)).toContain('Variables{\n  "id": "1"\n}');
    expect(html).toContain('Example Response');
  });

  test('examples from server', () => {
    const html = renderPage([{ type: 'operation', kind: 'query', name: 'customer' }], {
      examples: {
        'query:customer': [
          {
            name: 'Existing customer',
            description: 'Returns the `name` only.',
            query: 'query Existing {\n  customer(id: "1") {\n    name\n  }\n}',
            response: { data: { customer: { name: 'Ada' } } },
          },
          {
            name: 'Missing customer',
            query: 'query Missing($id: ID!) {\n  customer(id: $id) {\n    name\n  }\n}',
            variables: { id: '404' },
            response: { data: { customer: null } },
          },
        ],
      },
    });

    // the first example is selected, its description under the select
    expect(text(html)).toContain('Existing customer');
    expect(html).toContain('Returns the <code>name</code> only.');
    expect(text(html)).toContain('query Existing {');
    expect(text(html)).toContain('"name": "Ada"');
    // no variables
    expect(text(html)).not.toContain('Variables');
  });

  test('code usage of selected language', () => {
    codeUsage.id = 'curl';
    const Page = createGraphQLPage({
      components: { CodeBlock },
      playground: { headers: { 'content-type': 'text/plain', Authorization: 'Bearer <token>' } },
    });
    const html = renderToString(
      <Page payload={{ sdl }} items={[{ type: 'operation', kind: 'query', name: 'customer' }]} />,
    );

    expect(html).toContain('<pre data-lang="bash"><code>curl -X POST');
    // a placeholder without the URL of playground
    expect(html).toContain('https://api.example.com/graphql');
    // default headers, generators send JSON themselves
    expect(html).toContain('Authorization: Bearer &lt;token&gt;');
    expect(html).not.toContain('text/plain');
    expect(html).not.toContain('data-lang="graphql"');
  });

  test('subscriptions show their document only', () => {
    codeUsage.id = 'curl';
    const html = renderPage([{ type: 'operation', kind: 'subscription', name: 'orderUpdated' }]);

    expect(html).toContain('<pre data-lang="graphql"><code>subscription OrderUpdated(');
    expect(html).not.toContain('curl -X POST');
    // a label in place of the language select
    expect(text(html)).toContain('Example RequestGraphQL');
    expect(html).not.toContain('role="combobox"');
    // the choice still applies to other operations
    expect(renderPage([{ type: 'operation', kind: 'query', name: 'customer' }])).toContain(
      'curl -X POST',
    );
  });

  test('object type page', () => {
    const html = renderPage([{ type: 'type', kind: 'object', name: 'Customer' }]);

    expect(html).toContain('A registered customer.');
    // the definition bar
    expect(text(html)).toContain('typeCustomer implements Node');
    expect(html).toContain('href="/docs/types/Node"');
    expect(html).toContain('Fields');
    for (const field of ['name', 'email', 'contact', 'orders']) {
      expect(html).toContain(field);
    }
    // built-in scalars don't repeat the description of spec
    expect(html).not.toContain('unique identifier');
    // the card doesn't repeat the name of type
    expect(html).toMatch(/aria-current="page"[^>]*>fields</);
    // a field opens its arguments in a panel
    expect(text(html)).toContain('Argumentsstatus, first');
    // the reason of deprecation once, the row labels it
    expect(text(html)).toContain("The customer's email address.Use contact instead.");
    // the SDL
    expect(html).toContain('<pre data-lang="graphql"><code>type Customer implements Node {');
  });

  test('directives and enum values', () => {
    const html = renderPage([{ type: 'type', kind: 'object', name: 'Order' }]);

    // the directive is defined with a description, its chip opens the definition
    expect(html).toMatch(
      /<button[^>]*>@auth<span class="text-fd-muted-foreground">\(requires: USER\)<\/span><\/button>/,
    );
    // the values of `status`, the ones with a description or deprecation open them
    expect(html).toContain('Value in');
    expect(html).toMatch(/<code class="[^"]*">PENDING<\/code>/);
    expect(html).toMatch(/aria-haspopup="dialog"[^>]*>SHIPPED<\/button>/);
    expect(html).toMatch(
      /aria-haspopup="dialog"[^>]*class="[^"]*line-through[^"]*">CANCELLED<\/button>/,
    );
  });

  test('enum page', () => {
    const html = renderPage([{ type: 'type', kind: 'enum', name: 'OrderStatus' }]);

    expect(text(html)).toContain('enumOrderStatus');
    expect(html).toContain('Values');
    for (const value of ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']) {
      expect(html).toContain(`>${value}</code>`);
    }
    expect(html).toContain('The order is on its way.');
    expect(html).toContain('Use <code>REFUNDED</code> instead.');
  });

  test('interface, union, input and scalar pages', () => {
    const html = renderPage([
      { type: 'type', kind: 'interface', name: 'Node' },
      { type: 'type', kind: 'union', name: 'SearchResult' },
      { type: 'type', kind: 'input', name: 'OrderFilter' },
      { type: 'type', kind: 'scalar', name: 'DateTime' },
    ]);

    // implementations are listed once, in the usages
    expect(html.split('Implemented by').length).toBe(2);
    expect(text(html)).toContain('unionSearchResult = Customer | Order');
    expect(html).toContain('Possible Types');
    // input field with default value
    expect(html).toContain('PENDING');
    // scalar specification URL
    expect(html).toContain('href="https://scalars.graphql.org/andimarek/date-time"');
    expect(html).toContain('Specification');
  });

  test('one-of input object', () => {
    const html = renderPage([{ type: 'type', kind: 'input', name: 'OrderLookup' }], {
      sdl: `
        "Look up an order."
        input OrderLookup @oneOf {
          id: ID
          number: Int
        }

        type Query {
          order(by: OrderLookup!): String
        }
      `,
    });

    expect(text(html)).toContain('inputOrderLookup @oneOf');
    expect(text(html)).toContain('Exactly one ofidnumber');
    // fields are optional
    expect(html).not.toContain('text-red-400');
  });

  test('operation page with playground', () => {
    const PageWithPlayground = createGraphQLPage({
      components: { CodeBlock },
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

    expect(text(html)).toContain('QUERYorders(filter: OrderFilter): [Order!]!');
    expect(html).toContain('Try in Playground');
  });

  test('loads the schema of page props without SDL', async () => {
    const loadSchema = vi.fn(async () => sdl);
    const Page = createGraphQLPage({ components: { CodeBlock }, loadSchema });
    const items = [{ type: 'operation' as const, kind: 'query' as const, name: 'orders' }];
    const { prelude } = await prerender(<Page schema="store" payload={{}} items={items} />);

    expect(text(await new Response(prelude).text())).toContain('QUERYorders(filter: OrderFilter)');
    expect(loadSchema).toHaveBeenCalledExactlyOnceWith('store');
    expect(() => renderToString(<GraphQLPage schema="store" payload={{}} />)).toThrow(
      'pass `loadSchema`',
    );
  });
});
