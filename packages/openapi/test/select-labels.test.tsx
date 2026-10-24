import { fileURLToPath } from 'node:url';
import { prerender } from 'react-dom/static';
import { expect, test } from 'vitest';
import { createOpenAPIPage } from '@/ui';
import { loadDocument } from '@/utils/document/load';
import type { Document } from '@/types';

const museum = fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url));

async function readHtml(path: string, method: 'get' | 'post') {
  const { bundled } = await loadDocument(museum);
  const OpenAPIPage = createOpenAPIPage({ playground: { enabled: false } });
  const { prelude } = await prerender(
    <OpenAPIPage payload={{ bundled: bundled as Document }} operations={[{ path, method }]} />,
  );

  return await new Response(prelude).text();
}

test('names every select of an operation page', async () => {
  const html = await readHtml('/special-events', 'post');
  const triggers = html.match(/<button[^>]*role="combobox"[^>]*>/g) ?? [];

  // the code language, the response status and the media types
  expect(triggers.length).toBeGreaterThan(1);
  for (const trigger of triggers) {
    expect(trigger).toMatch(/aria-label="[^"]+"/);
  }
});
