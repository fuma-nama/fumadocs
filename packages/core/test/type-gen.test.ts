import { generateDocumentation } from '@/typescript';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, test, vi } from 'vitest';

const path = (s: string): string => fileURLToPath(new URL(s, import.meta.url));

describe('Generate docs from Typescript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const file = path('./fixtures/test.ts');

  vi.spyOn(process, 'cwd').mockReturnValue(path('../'));

  test('Run', () => {
    const result = ['Test1', 'Test2', 'Test3'].map((name) =>
      generateDocumentation({
        file,
        name,
      }),
    );

    console.log(process.cwd(), file, result);

    expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
      './fixtures/test.output.json',
    );
  });
});
