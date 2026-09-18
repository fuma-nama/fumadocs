import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { loadDocument } from '@/utils/document/load';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import {
  createOpenAPIPage,
  type ExampleRequest,
  OpenAPIProvider,
  type OperationInfo,
  OperationProvider,
  type PageOperationProps,
  type ResponseTab,
  useCodeUsage,
  useExampleRequests,
  useOperation,
  useResponseExamples,
} from '@/headless';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';
import type { Document, HttpMethods, OperationObject, PathItemObject } from '@/types';

const museum = fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url));
const components = {
  SchemaUI: () => null,
  Markdown: () => null,
  CodeBlock: () => null,
  Heading: () => null,
};

async function render(
  path: string,
  method: HttpMethods,
  Harness: () => null,
  extend?: (item: { operation: OperationObject; pathItem: PathItemObject }) => {
    operation: OperationObject;
    pathItem: PathItemObject;
  },
) {
  const { bundled } = await loadDocument(museum);
  const { dereferenced, resolve } = dereferenceBundledDocument(bundled as Document);
  let pathItem = resolve(dereferenced.paths![path])!;
  let operation = pathItem[method]!;
  if (extend) ({ operation, pathItem } = extend({ operation, pathItem }));

  renderToString(
    <OpenAPIProvider
      document={bundled}
      components={components}
      codeUsages={registerDefault(createCodeUsageGeneratorRegistry())}
    >
      <OperationProvider path={path} method={method} operation={operation} pathItem={pathItem}>
        <Harness />
      </OperationProvider>
    </OpenAPIProvider>,
  );
}

async function readOperation(path: string, method: HttpMethods) {
  let result: {
    operation: OperationInfo;
    examples: ExampleRequest[];
    selected: string | undefined;
    codeUsages: string[];
    tabs: ResponseTab[];
    curl?: string;
  };

  await render(path, method, function Harness() {
    const { items, selected } = useExampleRequests();
    result = {
      operation: useOperation(),
      examples: items,
      selected,
      codeUsages: Array.from(useOperation().codeUsages.map().keys()),
      tabs: useResponseExamples(),
      curl: useCodeUsage('curl'),
    };
    return null;
  });

  return result!;
}

test('derives the operation view model', async () => {
  const { operation, examples, selected, codeUsages, tabs, curl } = await readOperation(
    '/special-events',
    'post',
  );

  expect(operation.title).toBe('Create special events');
  expect(operation.requestBody).toMatchObject({ required: true });
  expect(Object.keys(operation.requestBody!.content)).toEqual(['application/json']);
  expect(operation.parameters).toEqual([]);
  // document-level security applies when the operation defines none
  expect(operation.security).toEqual([
    [{ key: 'MuseumPlaceholderAuth', scopes: [], scheme: { type: 'http', scheme: 'basic' } }],
  ]);
  expect(operation.responses.map((res) => res.status)).toEqual(['200', '400', '404']);
  expect(operation.callbacks).toEqual([]);
  expect(examples.map((item) => [item.id, item.pathname])).toEqual([
    ['default_example', '/special-events'],
    ['secondary_example', '/special-events'],
  ]);
  expect(selected).toBe('default_example');
  expect(codeUsages).toContain('curl');

  expect(tabs.map((tab) => [tab.code, tab.mediaType, tab.examples?.length])).toEqual([
    ['200', 'application/json', 1],
    ['400', null, undefined],
    ['404', null, undefined],
  ]);
  expect(curl).toContain('https://example.com/special-events');
});

test('groups parameters by location', async () => {
  const { operation, examples } = await readOperation('/special-events/{eventId}', 'get');

  expect(operation.parameters.map(({ in: location, items }) => [location, items.length])).toEqual([
    ['path', 1],
  ]);
  expect(operation.requestBody).toBeUndefined();
  expect(examples[0].pathname).toMatch(/^\/special-events\/[^{]/);
});

test('operation parameters override the path item', async () => {
  let info: OperationInfo;

  await render(
    '/museum-hours',
    'get',
    function Harness() {
      info = useOperation();
      return null;
    },
    ({ operation, pathItem }) => ({
      operation: { ...operation, parameters: [{ name: 'page', in: 'query', description: 'op' }] },
      pathItem: {
        ...pathItem,
        parameters: [
          { name: 'page', in: 'query', description: 'path' },
          { name: 'page', in: 'header' },
        ],
      },
    }),
  );

  expect(info!.parameters).toEqual([
    { in: 'query', items: [{ name: 'page', in: 'query', description: 'op' }] },
    { in: 'header', items: [{ name: 'page', in: 'header' }] },
  ]);
});

test('keeps falsy response examples', async () => {
  let tabs: ResponseTab[] = [];

  await render(
    '/museum-hours',
    'get',
    function Harness() {
      tabs = useResponseExamples();
      return null;
    },
    ({ operation, pathItem }) => ({
      operation: {
        ...operation,
        responses: {
          '200': { description: 'ok', content: { 'application/json': { example: 0 } } },
        },
      },
      pathItem,
    }),
  );

  expect(tabs[0].examples?.[0].sample).toBe(0);
});

test('generates inline code samples', async () => {
  let code: string | undefined;

  await render(
    '/museum-hours',
    'get',
    function Harness() {
      code = useCodeUsage('sdk');
      return null;
    },
    ({ operation, pathItem }) => ({
      operation: {
        ...operation,
        'x-codeSamples': [{ lang: 'js', id: 'sdk', source: 'client.getMuseumHours()' }],
      },
      pathItem,
    }),
  );

  expect(code).toBe('client.getMuseumHours()');
});

test('renders the operations and webhooks of a page', async () => {
  const { bundled } = await loadDocument(museum);
  const doc = {
    ...(bundled as Document),
    webhooks: { newExhibition: { post: { summary: 'New exhibition' } } },
  };
  const rendered: string[] = [];

  const OpenAPIPage = createOpenAPIPage({
    components: {
      ...components,
      Operation({ type, path, method, operation, showTitle }: PageOperationProps) {
        rendered.push(`${type} ${method} ${path} ${operation.summary} ${showTitle}`);
        return null;
      },
    },
  });

  renderToString(
    <OpenAPIPage
      payload={{ bundled: doc }}
      showTitle
      operations={[{ path: '/museum-hours', method: 'get' }]}
      webhooks={[{ name: 'newExhibition', method: 'post' }]}
    />,
  );

  expect(rendered).toEqual([
    'operation get /museum-hours Get museum hours true',
    'webhook post /newExhibition New exhibition true',
  ]);
});
