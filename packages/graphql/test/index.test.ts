import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { printSchema } from 'graphql';
import { createGraphQL, type GraphQLPageData } from '@/server';
import { buildSchemaFromSDL } from '@/utils/build-schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));

function create() {
  return createGraphQL({
    input: {
      store: path.join(cwd, './fixtures/store.graphql'),
    },
  });
}

describe('GraphQL source', () => {
  test('per item, grouped by kind', async () => {
    const source = await create().staticSource();

    expect(
      source.files.map((file) =>
        file.type === 'page'
          ? {
              path: file.path,
              title: file.data.title,
              deprecated: (file.data as unknown as { deprecated?: boolean }).deprecated,
              _graphql: (file.data as GraphQLPageData)._graphql,
            }
          : { path: file.path, meta: file.data },
      ),
    ).toMatchSnapshot();
  });

  test('page data & props', async () => {
    const source = await create().staticSource();
    const file = source.files.find((file) => file.path === '/queries/orders.mdx');

    expect(file).toBeDefined();
    expect(file!.type).toBe('page');
    const data = file!.data as GraphQLPageData;

    expect(data.toc).toEqual([]);
    expect(data.structuredData).toMatchInlineSnapshot(`
      {
        "contents": [
          {
            "content": "List all orders.",
            "heading": undefined,
          },
        ],
        "headings": [],
      }
    `);

    const props = data.getGraphQLPageProps();
    expect(props.items).toEqual([{ type: 'operation', kind: 'query', name: 'orders' }]);
    // the SDL payload can be re-built into a schema on client side
    const schema = buildSchemaFromSDL(props.payload.sdl);
    expect(schema.getQueryType()?.getFields().orders).toBeDefined();

    const typeFile = source.files.find((file) => file.path === '/objects/Order.mdx');
    expect(typeFile).toBeDefined();
    expect((typeFile!.data as GraphQLPageData).getGraphQLPageProps().items).toEqual([
      { type: 'type', kind: 'object', name: 'Order' },
    ]);
  });

  test('per item with meta files', async () => {
    const source = await create().staticSource({ meta: true });
    const metaFiles = source.files.filter((file) => file.type === 'meta');

    expect(metaFiles).toMatchSnapshot();
  });

  test('per file', async () => {
    const source = await create().staticSource({ per: 'file' });

    expect(source.files).toHaveLength(1);
    const file = source.files[0];
    expect(file.path).toBe('/store.mdx');

    const data = file.data as GraphQLPageData;
    expect(data.toc.map((item) => item.title)).toMatchInlineSnapshot(`
      [
        "Customer",
        "Orders",
        "Search",
        "Node",
        "Create Order",
        "Legacy Create Order",
        "Order Updated",
        "Role",
        "DateTime",
        "Node",
        "OrderStatus",
        "Customer",
        "ContactInfo",
        "Order",
        "SearchResult",
        "OrderFilter",
        "OrderCreateInput",
      ]
    `);
  });

  test('custom pages builder', async () => {
    const source = await create().staticSource({
      per: 'custom',
      toPages(builder) {
        builder.create({
          type: 'operation',
          schemaId: builder.id,
          path: 'my-orders.mdx',
          info: { title: 'My Orders' },
          item: { kind: 'query', name: 'orders' },
        });
      },
    });

    expect(source.files).toHaveLength(1);
    expect(source.files[0].path).toBe('/my-orders.mdx');
    expect(source.files[0].data.title).toBe('My Orders');
  });

  test('SDL text & GraphQLSchema instance inputs', async () => {
    const sdl = `
type Query {
  hello: String!
}
`.trim();

    const fromText = createGraphQL({ input: { api: sdl } });
    expect((await fromText.getSchema('api')).sdl).toBe(sdl);

    const fromInstance = createGraphQL({
      input: { api: () => buildSchemaFromSDL(sdl) },
    });
    const loaded = await fromInstance.getSchema('api');
    expect(loaded.sdl).toBe(printSchema(loaded.schema));
  });
});

describe('buildSchemaFromSDL', () => {
  test('supports type extensions', () => {
    const schema = buildSchemaFromSDL(
      `
type Query {
  hello: String!
}

extend type Query {
  world: String!
}
`.trim(),
    );

    const fields = schema.getQueryType()!.getFields();
    expect(Object.keys(fields)).toEqual(['hello', 'world']);
  });
});
