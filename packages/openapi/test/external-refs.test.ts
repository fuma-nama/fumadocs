import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadDocument } from '@/utils/document/load';
import { dereferenceBundledDocument } from '@/utils/document/dereference';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const externalDir = path.join(cwd, './fixtures/external-refs');

async function writeExternalFixtures(
  files: Record<string, string>,
  rootName = 'root.yaml',
): Promise<{ rootFile: string }> {
  await mkdir(externalDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(externalDir, name), contents);
  }

  return { rootFile: path.join(externalDir, rootName) };
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

// https://github.com/fuma-nama/fumadocs/issues/3515
test('upgrades OpenAPI 3.0 schemas from external files', async () => {
  const { rootFile } = await writeExternalFixtures(
    {
      'email.yaml': `openapi: 3.0.3
info:
  title: Example schemas
  version: 1.0.0
paths: {}
components:
  schemas:
    EmailAddress:
      type: string
      example: noreply@example.com
`,
      'upgrade-root.yaml': `openapi: 3.0.3
info:
  title: Example API
  version: 1.0.0
paths:
  /email:
    post:
      operationId: sendEmail
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: './email.yaml#/components/schemas/EmailAddress'
      responses:
        '204':
          description: Accepted
`,
    },
    'upgrade-root.yaml',
  );

  const { bundled } = await loadDocument(rootFile);
  const { dereferenced, resolve } = dereferenceBundledDocument(bundled);

  const body = resolve(dereferenced.paths?.['/email']?.post?.requestBody);
  const media = resolve(body?.content?.['application/json']);
  const schema = resolve(media?.schema) as Record<string, any>;

  // `example` must be upgraded to the JSON Schema array form, even when the schema lives in an external file (embedded under `x-ext`)
  expect(schema).toEqual({
    type: 'string',
    examples: ['noreply@example.com'],
  });
});

test('upgrades OpenAPI 3.0 external files referenced from a 3.1 document', async () => {
  const { rootFile } = await writeExternalFixtures(
    {
      'nullable-email.yaml': `openapi: 3.0.3
info:
  title: Example schemas
  version: 1.0.0
paths: {}
components:
  schemas:
    EmailAddress:
      type: string
      nullable: true
      example: noreply@example.com
`,
      'mixed-root.yaml': `openapi: 3.1.0
info:
  title: Example API
  version: 1.0.0
paths:
  /email:
    post:
      operationId: sendEmail
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: './nullable-email.yaml#/components/schemas/EmailAddress'
      responses:
        '204':
          description: Accepted
`,
    },
    'mixed-root.yaml',
  );

  const { bundled } = await loadDocument(rootFile);
  const { dereferenced, resolve } = dereferenceBundledDocument(bundled);

  const body = resolve(dereferenced.paths?.['/email']?.post?.requestBody);
  const media = resolve(body?.content?.['application/json']);
  const schema = resolve(media?.schema) as Record<string, any>;

  // the external document declares its own version, it must be upgraded even when the root document doesn't need to
  expect(schema).toEqual({
    type: ['string', 'null'],
    examples: ['noreply@example.com'],
  });
});

test('upgrades documents given as objects', async () => {
  await writeExternalFixtures({
    'email.yaml': `openapi: 3.0.3
info:
  title: Example schemas
  version: 1.0.0
paths: {}
components:
  schemas:
    EmailAddress:
      type: string
      example: noreply@example.com
`,
  });

  const { bundled } = await loadDocument({
    openapi: '3.0.3',
    info: { title: 'Example API', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        Email: {
          type: 'object',
          properties: {
            subject: { type: 'string', example: 'Hi' },
            address: {
              $ref: `${path.join(externalDir, 'email.yaml')}#/components/schemas/EmailAddress`,
            },
          },
        },
      },
    },
  } as never);

  expect(bundled.openapi).toBe('3.2.0');
  const { dereferenced, resolve } = dereferenceBundledDocument(bundled);
  const email = resolve(dereferenced.components?.schemas?.Email) as Record<string, any>;

  expect(email.properties.subject).toEqual({
    type: 'string',
    examples: ['Hi'],
  });
  expect(resolve(email.properties.address)).toEqual({
    type: 'string',
    examples: ['noreply@example.com'],
  });
});
