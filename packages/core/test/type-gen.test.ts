import { generateDocumentation } from '@/typescript';
import { fileURLToPath } from 'url';
import { describe, expect, test, vi } from 'vitest';

describe('Generate docs from Typescript', () => {
  const path = (s: string): string =>
    fileURLToPath(new URL(s, import.meta.url));
  const file = path('./fixtures/test.ts');

  vi.spyOn(process, 'cwd').mockReturnValue(path('../'));

  test('Run', () => {
    const result = ['Test1', 'Test2', 'Test3'].map((name) =>
      generateDocumentation({
        file,
        name,
      }),
    );

    expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
      './fixtures/test.output.json',
    );
  });
});
