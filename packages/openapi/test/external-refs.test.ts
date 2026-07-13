import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadDocument } from '@/utils/document/load';
import { dereferenceBundledDocument } from '@/utils/document/dereference';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const externalDir = path.join(cwd, './fixtures/external-refs');

async function writeExternalFixtures(files: Record<string, string>): Promise<{ rootFile: string }> {
  await mkdir(externalDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(externalDir, name), contents);
  }

  return { rootFile: path.join(externalDir, 'root.yaml') };
}

test('bundles & lazily dereferences documents with external file refs', async () => {
  const { rootFile } = await writeExternalFixtures({
    'category.yaml': `components:
  schemas:
    Category:
      type: object
      properties:
        name:
          type: string
        parent:
          $ref: '#/components/schemas/Category'
`,
    'pet.yaml': `type: object
required:
  - name
properties:
  name:
    type: string
  category:
    $ref: './category.yaml#/components/schemas/Category'
`,
    'root.yaml': `openapi: 3.1.0
info:
  title: External refs
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: './pet.yaml'
`,
  });

  const { bundled } = await loadDocument(rootFile);
  // external documents are embedded into `x-ext`
  expect(bundled).toHaveProperty('x-ext');

  const { dereferenced, resolve } = dereferenceBundledDocument(bundled);

  const response = resolve(dereferenced.paths?.['/pets']?.get?.responses?.['200']);
  const media = resolve(response?.content?.['application/json']);
  const schemaRef = media?.schema as Record<string, any>;

  // Reference Objects remain in the lazy document
  expect(schemaRef.$ref).toMatch(/^#\/x-ext\//);

  const schema = resolve(schemaRef) as Record<string, any>;
  expect(schema).toMatchObject({
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string' },
    },
  });

  // external schema resolved through `x-ext`
  const category = resolve(schema.properties.category) as Record<string, any>;
  expect(category).toMatchObject({
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
  });

  // circular refs resolve lazily and keep referential stability
  const parent = resolve(category.properties.parent);
  expect(parent).toBe(category);
  expect(resolve(parent.properties!.parent)).toBe(category);
});
