import type { Awaitable } from '@/types';

export interface PlaceholderData {
  name: string | null;
  attributes: Record<string, unknown>;
  children: string;
}

// oxlint-disable-next-line no-control-regex -- by design
const regex = /\0(.+?)\0/gs;

export async function renderPlaceholder(
  text: string,
  renderers: Record<string, (data: PlaceholderData) => Awaitable<string>>,
): Promise<string> {
  let out = '';
  let idx = 0;

  for (const match of text.matchAll(regex)) {
    out += text.slice(idx, match.index);
    const inner = match[1];
    try {
      const data = JSON.parse(inner) as PlaceholderData;
      const renderer = data.name && renderers[data.name];
      if (data.children.trim()) {
        data.children = await renderPlaceholder(data.children, renderers);
      }

      if (renderer) {
        out += await renderer(data);
      } else {
        out += data.children;
      }
    } catch {
      out += match[0];
    }

    idx = match.index + match[0].length;
  }
  out += text.slice(idx);

  return out;
}
