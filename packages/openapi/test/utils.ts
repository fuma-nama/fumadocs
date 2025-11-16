import { RenderContext } from '@/types';
import { processDocument } from '@/utils/process-document';
import Slugger from 'github-slugger';

export async function renderContextFrom(input: string): Promise<RenderContext> {
  const schema = await processDocument(input);

  return {
    mediaAdapters: {},
    renderCodeBlock(_lang, code) {
      return code;
    },
    renderHeading(_depth, text) {
      return text;
    },
    renderMarkdown(text) {
      return text;
    },
    schema,
    servers: schema.dereferenced.servers!,
    slugger: new Slugger(),
  };
}
