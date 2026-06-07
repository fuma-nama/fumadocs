import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { generateFilesOnly } from '@/generate-file';
import { createAsyncAPI } from '@/server';
import path from 'node:path';

const cwd = fileURLToPath(new URL('./', import.meta.url));

function stringifyOutput(files: { path: string; content: string }[]) {
  return files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `## ${file.path}\n\n${file.content}`)
    .join('\n\n');
}

describe('Generate AsyncAPI documents', () => {
  test('Streetlights (Per Operation)', async () => {
    const out = await generateFilesOnly({
      input: createAsyncAPI({
        input: {
          streetlights: path.join(cwd, './fixtures/streetlights.yaml'),
        },
      }),
      per: 'operation',
    });

    expect(out).toHaveLength(2);
    expect(out.some((file) => file.path.includes('receiveLightMeasurement'))).toBe(true);
    expect(out.some((file) => file.path.includes('sendLightMeasurement'))).toBe(true);
    expect(out.every((file) => file.content.includes('<APIPage'))).toBe(true);
    expect(out.every((file) => file.content.includes('_asyncapi:'))).toBe(true);
  });

  test('Streetlights (Per Tag)', async () => {
    const out = await generateFilesOnly({
      input: createAsyncAPI({
        input: {
          streetlights: path.join(cwd, './fixtures/streetlights.yaml'),
        },
      }),
      per: 'tag',
    });

    expect(out).toHaveLength(1);
    expect(out[0].path).toContain('lighting');
    expect(out[0].content).toContain('receiveLightMeasurement');
    expect(out[0].content).toContain('sendLightMeasurement');
  });

  test('Streetlights (Per File)', async () => {
    const out = await generateFilesOnly({
      input: createAsyncAPI({
        input: {
          streetlights: path.join(cwd, './fixtures/streetlights.yaml'),
        },
      }),
      per: 'file',
    });

    expect(out).toHaveLength(1);
    expect(out[0].path).toContain('streetlights');
    expect(stringifyOutput(out)).toMatchSnapshot();
  });

  test('throws error when no input files found', async () => {
    await expect(
      generateFilesOnly({
        input: createAsyncAPI({ input: {} }),
        per: 'file',
      }),
    ).rejects.toThrowError();
  });
});
