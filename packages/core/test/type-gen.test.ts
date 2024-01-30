import { generateDocumentation } from '../src/typescript';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import path from 'node:path';

const relative = (s: string): string =>
  path.resolve(fileURLToPath(new URL(s, import.meta.url)));

describe('Generate docs from Typescript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const file = relative('./fixtures/test.ts');
  test('Run', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(relative('../'));

    const result = ['Test1', 'Test2', 'Test3'].map((name) =>
      generateDocumentation({
        file,
        name,
        options: {
          tsconfigPath: relative('../tsconfig.json'),
          basePath: relative('../'),
        },
      }),
    );

    expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
      './fixtures/test.output.json',
    );
  });
});
