import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { bundle } from '@/schema/bundle';
import { dereferenceShallow } from '@/schema/dereference';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const externalDir = path.join(cwd, './fixtures/external');

async function writeExternalFixtures(files: Record<string, string>): Promise<{ rootFile: string }> {
  await mkdir(externalDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(externalDir, name), contents);
  }

  return { rootFile: path.join(externalDir, 'root.yaml') };
}

/** resolve the `$ref` of node (at `path` of `doc`) with a magic proxy */
function followRef(doc: object, path: string[]): unknown {
  let node: unknown = createMagicProxy(doc as Record<string, unknown>);
  for (const seg of path) node = (node as Record<string, unknown>)[seg];

  expect(node).toHaveProperty('$ref');
  expect((node as { $ref: string }).$ref).toMatch(/^#\/x-ext\//);
  return (node as Record<string, unknown>)['$ref-value'];
}

describe('bundle', () => {
  test('loads a yaml file with internal refs', async () => {
    const result = await bundle(path.join(cwd, './fixtures/double-oneof.yaml'));

    expect(result).toMatchObject({
      openapi: '3.1.0',
      paths: {
        '/items': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateItem',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test('embeds external file refs into `x-ext`', async () => {
    const { rootFile } = await writeExternalFixtures({
      'pet.yaml': `type: object
properties:
  name:
    type: string
`,
      'root.yaml': `openapi: 3.1.0
info:
  title: External refs
  version: 1.0.0
components:
  schemas:
    Pet:
      $ref: './pet.yaml'
    PetList:
      type: array
      items:
        $ref: './pet.yaml'
`,
    });

    const result = await bundle<{
      components: {
        schemas: {
          Pet: { $ref: string };
          PetList: { type: string; items: { $ref: string } };
        };
      };
    }>(rootFile);

    expect(followRef(result, ['components', 'schemas', 'Pet'])).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    // both use sites point to the same embedded document
    expect(result.components.schemas.PetList.items.$ref).toBe(result.components.schemas.Pet.$ref);
  });

  test('bundles chained external refs', async () => {
    const { rootFile } = await writeExternalFixtures({
      'owner.yaml': `type: object
properties:
  owner:
    type: string
`,
      'pet.yaml': `allOf:
  - type: object
    properties:
      name:
        type: string
  - $ref: './owner.yaml'
`,
      'root.yaml': `openapi: 3.1.0
info:
  title: Chained refs
  version: 1.0.0
components:
  schemas:
    Pet:
      $ref: './pet.yaml'
`,
    });

    const result = await bundle<{
      components: {
        schemas: {
          Pet: { $ref: string };
        };
      };
    }>(rootFile);

    const pet = followRef(result, ['components', 'schemas', 'Pet']) as {
      allOf: [unknown, { $ref: string }];
    };
    expect(pet.allOf[0]).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    expect(dereferenceShallow(pet.allOf[1])).toEqual({
      type: 'object',
      properties: {
        owner: { type: 'string' },
      },
    });
  });

  test('rewrites sub-path refs into the embedded document', async () => {
    const { rootFile } = await writeExternalFixtures({
      'shared.yaml': `components:
  schemas:
    Pet:
      type: object
      properties:
        name:
          type: string
`,
      'root.yaml': `openapi: 3.1.0
info:
  title: Sub-path refs
  version: 1.0.0
paths:
  /pets:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: './shared.yaml#/components/schemas/Pet'
components:
  schemas:
    PetRef:
      $ref: './shared.yaml#/components/schemas/Pet'
`,
    });

    const result = await bundle<{
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: string };
                  };
                };
              };
            };
          };
        };
      };
      components: {
        schemas: {
          PetRef: { $ref: string };
        };
      };
    }>(rootFile);

    const schema = result.paths['/pets'].get.responses['200'].content['application/json'].schema;
    expect(schema.$ref).toMatch(/^#\/x-ext\/.+\/components\/schemas\/Pet$/);
    expect(schema.$ref).toBe(result.components.schemas.PetRef.$ref);

    expect(followRef(result, ['components', 'schemas', 'PetRef'])).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });

  test('preserves sibling properties on extended refs', async () => {
    const { rootFile } = await writeExternalFixtures({
      'pet.yaml': `type: object
properties:
  name:
    type: string
`,
      'root.yaml': `openapi: 3.1.0
info:
  title: Extended refs
  version: 1.0.0
components:
  schemas:
    Pet:
      $ref: './pet.yaml'
      description: A pet
`,
    });

    const result = await bundle<{
      components: {
        schemas: {
          Pet: { $ref: string; description: string };
        };
      };
    }>(rootFile);

    // bundle keeps the Reference Object, sibling keywords are merged when dereferencing
    expect(result.components.schemas.Pet.description).toBe('A pet');
    const proxied = createMagicProxy(result as unknown as Record<string, unknown>) as typeof result;
    expect(dereferenceShallow(proxied.components.schemas.Pet)).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      description: 'A pet',
    });
  });

  test('keeps internal refs that traverse through another ref resolvable', async () => {
    const result = await bundle({
      openapi: '3.1.0',
      components: {
        schemas: {
          Name: { type: 'string' },
          Alias: { $ref: '#/components/schemas/Name' },
          Wrapper: {
            properties: {
              value: { $ref: '#/components/schemas/Alias' },
            },
          },
        },
      },
    });

    const value = (
      result as {
        components: {
          schemas: {
            Wrapper: { properties: { value: { $ref: string } } };
          };
        };
      }
    ).components.schemas.Wrapper.properties.value;

    // internal refs are untouched, chained refs are resolved by the dereference layer
    expect(value).toEqual({
      $ref: '#/components/schemas/Alias',
    });
    const proxied = createMagicProxy(result as Record<string, unknown>) as never as {
      components: { schemas: { Wrapper: { properties: { value: unknown } } } };
    };
    expect(dereferenceShallow(proxied.components.schemas.Wrapper.properties.value)).toEqual({
      type: 'string',
    });
  });
});
