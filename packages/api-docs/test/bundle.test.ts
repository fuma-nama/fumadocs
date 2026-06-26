import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { bundle } from '@/schema/bundle';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const externalDir = path.join(cwd, './fixtures/external');

async function writeExternalFixtures(files: Record<string, string>): Promise<{ rootFile: string }> {
  await mkdir(externalDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(externalDir, name), contents);
  }

  return { rootFile: path.join(externalDir, 'root.yaml') };
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

  test('bundles external file refs into the root document', async () => {
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
          Pet: { type: string; properties: { name: { type: string } } };
          PetList: { type: string; items: { $ref: string } };
        };
      };
    }>(rootFile);

    expect(result.components.schemas.Pet).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    expect(result.components.schemas.PetList.items).toEqual({
      $ref: '#/components/schemas/Pet',
    });
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
          Pet: {
            allOf: [
              { type: string; properties: { name: { type: string } } },
              { type: string; properties: { owner: { type: string } } },
            ];
          };
        };
      };
    }>(rootFile);

    expect(result.components.schemas.Pet.allOf[1]).toEqual({
      type: 'object',
      properties: {
        owner: { type: 'string' },
      },
    });
  });

  test('remaps sub-path refs under an inlined parent fragment', async () => {
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
                    schema: { type: string; properties: { name: { type: string } } };
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

    expect(result.paths['/pets'].get.responses['200'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/PetRef',
    });
    expect(result.components.schemas.PetRef).toEqual({
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
          Pet: {
            type: string;
            description: string;
            properties: { name: { type: string } };
          };
        };
      };
    }>(rootFile);

    expect(result.components.schemas.Pet).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      description: 'A pet',
    });
  });

  test('fixes refs that traverse through another ref', async () => {
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

    expect(
      (
        result as {
          components: {
            schemas: {
              Wrapper: { properties: { value: { $ref: string } } };
            };
          };
        }
      ).components.schemas.Wrapper.properties.value,
    ).toEqual({
      $ref: '#/components/schemas/Name',
    });
  });
});
