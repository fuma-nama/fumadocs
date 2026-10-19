import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  type CodeUsageData,
  createCodeUsageGeneratorRegistry,
  registerDefaultCodeUsages,
} from '@/codegen';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { generateOperationExample } from '@/utils/example';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const schema = buildSchemaFromSDL(
  fs.readFileSync(path.join(cwd, './fixtures/store.graphql'), 'utf8'),
);
const customer = generateOperationExample(schema, { kind: 'query', name: 'customer' })!;
const registry = registerDefaultCodeUsages(createCodeUsageGeneratorRegistry());
const url = 'https://api.example.com/graphql';

const cases: Record<string, CodeUsageData> = {
  customer: {
    url,
    query: customer.query,
    variables: customer.variables,
    headers: { Authorization: 'Bearer <token>' },
  },
  tricky: {
    url,
    query: [
      '# `backticks` ${x} $HOME !bang \'single\' "double" \\ "# "##',
      'query Tricky($text: String! = "say \\"hi\\" \\\\ ${x}") {',
      '  echo(text: "日本語 🎉 \\n é \'single\' `tick` $HOME !bang")',
      '  block: echo(text: """',
      '    "quoted" \\""" escaped, \\"""" four quotes, "#"## end with a quote "',
      '  """)',
      '  empty: echo(text: """""")',
      '}',
      '# ends with a quote "',
    ].join('\n'),
    variables: {
      text: 'q"uote \'single\' \\ `tick` ${x} $HOME !bang "# "## """ é 🎉\nnewline',
      large: 2147483648,
      list: [true, null, 10.5],
    },
    headers: { 'X-Tricky': '"dq" \'sq\' \\ `tick` ${x} $HOME !bang "#' },
  },
  'no-variables': { url, query: 'query Orders {\n  orders {\n    id\n  }\n}', headers: {} },
};

const extensions: Record<string, string> = {
  curl: 'sh',
  js: 'js',
  go: 'go',
  python: 'py',
  java: 'java',
  csharp: 'cs',
  rust: 'rs',
};

test('default generators', () => {
  expect(Array.from(registry.map(), ([id, { label, lang }]) => `${id}: ${label} (${lang})`))
    .toMatchInlineSnapshot(`
      [
        "curl: cURL (bash)",
        "js: JavaScript (js)",
        "go: Go (go)",
        "python: Python (python)",
        "java: Java (java)",
        "csharp: C# (csharp)",
        "rust: Rust (rust)",
      ]
    `);
});

describe.each(Object.entries(cases))('%s', (name, data) => {
  test.each(Array.from(registry.map()))('%s', async (id, generator) => {
    await expect(generator.generate(data, undefined)).toMatchFileSnapshot(
      `./out/samples/${name}.${extensions[id]}`,
    );
  });
});

test('literals never hold characters their language drops or rejects', () => {
  const chars = 'a\rb\r\n\0\uFEFF\u202E  \n';
  const data: CodeUsageData = { url, query: `{ a }${chars}`, variables: { chars }, headers: {} };
  const forbidden: Record<string, RegExp> = {
    // line breaks are normalized in template literals, triple-quoted strings and text blocks
    js: /\r/,
    python: /[\r\0]/,
    // text blocks also strip trailing white space
    java: /\r|[^\S\n]\n/,
    // raw strings discard CR, NUL and BOM are rejected in source
    go: /[\r\0\uFEFF]/,
    // rustc rejects isolated CR and text direction controls in literals
    rust: /[\r\u202E]/,
  };

  for (const [id, pattern] of Object.entries(forbidden)) {
    expect(registry.get(id)!.generate(data, undefined)).not.toMatch(pattern);
  }
});
