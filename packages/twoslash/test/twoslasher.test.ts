import { expect, test } from 'vitest';
import { createTwoslasher, type TwoslashReturn } from '../src/twoslasher';
import type { TwoslashNode } from '../src/notations';
import { fileURLToPath } from 'node:url';

function byType<T extends TwoslashNode['type']>(result: TwoslashReturn, type: T) {
  return result.nodes.filter(
    (node): node is Extract<TwoslashNode, { type: T }> => node.type === type,
  );
}
const hovers = (result: TwoslashReturn) => byType(result, 'hover');

const twoslasher = createTwoslasher({
  cwd: fileURLToPath(new URL('./', import.meta.url)),
  compilerOptions: { types: ['node'] },
});

test('hover', () => {
  const result = twoslasher(`
import { readFileSync } from 'node:fs';

interface Player {
  /** The player name */
  name?: string;
  greet(other: Player): string;
}

const player: Player = { name: 'hello', greet: (other) => other.name ?? '' };
let count = 1;
function add(a: number, b?: number): number;
function add(a: string): string;
function add(a: any, b?: any) {
  return a + b;
}
add(count, 2);
readFileSync('file.txt', 'utf-8');
`);

  expect(hovers(result).map((v) => [v.target, v.text, v.docs])).toMatchInlineSnapshot(`
    [
      [
        "readFileSync",
        "(alias) function readFileSync<T extends NodeJS.ArrayBufferView>(path: PathOrFileDescriptor, options: ReadFileSyncOptionsWithBuffer<T>): BufferView<T> (+3 overloads)
    import readFileSync",
        "Returns the contents of the \`path\`.

    For detailed information, see the documentation of the asynchronous version of
    this API: \`fs.readFile()\`.

    If the \`encoding\` option is specified then this function returns a
    string. Otherwise it returns a buffer.

    If \`buffer\` is provided and no encoding is specified, the returned {Buffer} is
    a view over the supplied buffer containing only the bytes read. If the
    supplied buffer is too small to contain the entire file, an error will be
    thrown.

    Similar to \`fs.readFile()\`, when the path is a directory, the behavior of
    \`fs.readFileSync()\` is platform-specific.

    \`\`\`js
    import { readFileSync } from 'node:fs';

    // macOS, Linux, and Windows
    readFileSync('<directory>');
    // => [Error: EISDIR: illegal operation on a directory, read <directory>]

    //  FreeBSD
    readFileSync('<directory>'); // => <data>
    \`\`\`",
      ],
      [
        "Player",
        "interface Player",
        undefined,
      ],
      [
        "name",
        "(property) Player.name?: string | undefined",
        "The player name",
      ],
      [
        "greet",
        "(method) Player.greet(other: Player): string",
        undefined,
      ],
      [
        "other",
        "(parameter) other: Player",
        undefined,
      ],
      [
        "Player",
        "interface Player",
        undefined,
      ],
      [
        "player",
        "const player: Player",
        undefined,
      ],
      [
        "Player",
        "interface Player",
        undefined,
      ],
      [
        "name",
        "(property) Player.name?: string | undefined",
        "The player name",
      ],
      [
        "greet",
        "(method) Player.greet(other: Player): string",
        undefined,
      ],
      [
        "other",
        "(parameter) other: Player",
        undefined,
      ],
      [
        "other",
        "(parameter) other: Player",
        undefined,
      ],
      [
        "name",
        "(property) Player.name?: string | undefined",
        "The player name",
      ],
      [
        "count",
        "let count: number",
        undefined,
      ],
      [
        "add",
        "function add(a: number, b?: number): number (+1 overload)",
        undefined,
      ],
      [
        "a",
        "(parameter) a: number",
        undefined,
      ],
      [
        "b",
        "(parameter) b: number | undefined",
        undefined,
      ],
      [
        "add",
        "function add(a: number, b?: number): number (+1 overload)",
        undefined,
      ],
      [
        "a",
        "(parameter) a: string",
        undefined,
      ],
      [
        "add",
        "function add(a: number, b?: number): number (+1 overload)",
        undefined,
      ],
      [
        "a",
        "(parameter) a: any",
        undefined,
      ],
      [
        "b",
        "(parameter) b: any",
        undefined,
      ],
      [
        "a",
        "(parameter) a: any",
        undefined,
      ],
      [
        "b",
        "(parameter) b: any",
        undefined,
      ],
      [
        "add",
        "function add(a: number, b?: number): number (+1 overload)",
        undefined,
      ],
      [
        "count",
        "let count: number",
        undefined,
      ],
      [
        "readFileSync",
        "(alias) readFileSync(path: PathOrFileDescriptor, options: ReadFileSyncOptionsWithStringEncoding | BufferEncoding): string (+3 overloads)
    import readFileSync",
        "Returns the contents of the \`path\`.

    For detailed information, see the documentation of the asynchronous version of
    this API: \`fs.readFile()\`.

    If the \`encoding\` option is specified then this function returns a
    string. Otherwise it returns a buffer.

    If \`buffer\` is provided and no encoding is specified, the returned {Buffer} is
    a view over the supplied buffer containing only the bytes read. If the
    supplied buffer is too small to contain the entire file, an error will be
    thrown.

    Similar to \`fs.readFile()\`, when the path is a directory, the behavior of
    \`fs.readFileSync()\` is platform-specific.

    \`\`\`js
    import { readFileSync } from 'node:fs';

    // macOS, Linux, and Windows
    readFileSync('<directory>');
    // => [Error: EISDIR: illegal operation on a directory, read <directory>]

    //  FreeBSD
    readFileSync('<directory>'); // => <data>
    \`\`\`",
      ],
    ]
  `);
});

test('queries and completions', () => {
  const result = twoslasher(`
// @noErrors
const player = { name: 'hello' };
//     ^?
player.na
//       ^|
`);

  expect(result.code).toMatchInlineSnapshot(`
    "
    const player = { name: 'hello' };
    player.na
    "
  `);
  expect(byType(result, 'query').map((v) => v.text)).toMatchInlineSnapshot(`
    [
      "const player: {
        name: string;
    }",
    ]
  `);
  expect(byType(result, 'completion').map((v) => v.completions)).toMatchInlineSnapshot(`
    [
      [
        {
          "kind": "property",
          "name": "name",
        },
      ],
    ]
  `);
});

test('errors', () => {
  const result = twoslasher(`
// @errors: 2322
const a: string = 1;
`);

  expect(byType(result, 'error').map((v) => [v.code, v.text])).toMatchInlineSnapshot(`
    [
      [
        2322,
        "Type 'number' is not assignable to type 'string'.",
      ],
    ]
  `);
  expect(() => twoslasher(`const a: string = 1;`)).toThrow();
});

test('cut and filename', () => {
  const result = twoslasher(`
// @filename: util.ts
export const value = 1;
// @filename: index.ts
import { value } from './util';
// ---cut---
console.log(value);
`);

  expect(result.code).toMatchInlineSnapshot(`
    "console.log(value);
    "
  `);
  expect(hovers(result).map((v) => v.text)).toMatchInlineSnapshot(`
    [
      "var console: Console",
      "(method) Console.log(...data: any[]): void",
      "(alias) const value: 1
    import value",
    ]
  `);
});

test('batch', async () => {
  const a = `const a: string = 'a';\na.length;`;
  const b = `import { readFileSync } from 'node:fs';\nreadFileSync;`;
  await Promise.all([twoslasher.prepare(a), twoslasher.prepare(b, 'tsx')]);

  expect(hovers(twoslasher(a)).map((v) => v.text)).toEqual([
    'const a: string',
    'const a: string',
    '(property) String.length: number',
  ]);
  expect(hovers(twoslasher(b, 'tsx'))[1].text).toMatch(/^\(alias\) function readFileSync/);
  // errors are reported by the synchronous call
  await twoslasher.prepare('const c: string = 1;');
  expect(() => twoslasher('const c: string = 1;')).toThrow();
});
