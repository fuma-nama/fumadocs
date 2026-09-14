import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { loadDocument } from '@/utils/document/load';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import {
  type ExampleRequest,
  OpenAPIProvider,
  type OperationInfo,
  OperationProvider,
  type ResponseTab,
  useCodeUsage,
  useCodeUsages,
  useExampleRequests,
  useOperation,
  useResponseExamples,
} from '@/headless';
import { useOperationContext } from '@/ui/operation/context';
import type { Document, HttpMethods, OperationObject } from '@/types';

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
  extend?: (operation: OperationObject) => OperationObject,
) {
  const { bundled } = await loadDocument(museum);
  const { dereferenced, resolve } = dereferenceBundledDocument(bundled as Document);
  const pathItem = resolve(dereferenced.paths![path])!;
  const operation = extend ? extend(pathItem[method]!) : pathItem[method]!;

  renderToString(
    <OpenAPIProvider document={bundled} components={components}>
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
      codeUsages: useCodeUsages().map((item) => item.id),
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

test('legacy listeners receive the selected example immediately', async () => {
  const seen: string[] = [];

  await render('/special-events', 'post', function Harness() {
    const { addListener, removeListener } = useOperationContext();
    const listener = (data: { method: string }) => seen.push(data.method);
    addListener(listener);
    removeListener(listener);
    return null;
  });

  expect(seen).toEqual(['post']);
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
    (operation) => ({
      ...operation,
      'x-codeSamples': [{ lang: 'js', id: 'sdk', source: 'client.getMuseumHours()' }],
    }),
  );

  expect(code).toBe('client.getMuseumHours()');
});
