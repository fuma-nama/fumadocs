export type FormatPreference = 'markdown' | 'html' | null;

export interface PreferenceOptions {
  markdownTypes?: readonly string[];
  htmlTypes?: readonly string[];
}

export interface MediaTypePreference {
  value: string;
  q: number;
  order: number;
}

const DEFAULT_MARKDOWN_TYPES = [
  'text/markdown',
  'text/x-markdown',
  'text/plain',
] as const;

const DEFAULT_HTML_TYPES = [
  'text/html',
  'application/xhtml+xml',
] as const;

export function pickPreferredFormat(
  headers: Headers,
  options: PreferenceOptions = {},
): FormatPreference {
  const entries = parseAcceptHeader(headers);
  if (entries.length === 0) return null;

  const markdownTypes = new Set(
    options.markdownTypes ?? DEFAULT_MARKDOWN_TYPES,
  );
  const htmlTypes = new Set(options.htmlTypes ?? DEFAULT_HTML_TYPES);

  let bestMarkdown: MediaTypePreference | undefined;
  let bestHtml: MediaTypePreference | undefined;

  for (const entry of entries) {
    const type = entry.value;
    if (markdownTypes.has(type)) {
      if (!bestMarkdown || isBetter(entry, bestMarkdown)) bestMarkdown = entry;
    } else if (htmlTypes.has(type)) {
      if (!bestHtml || isBetter(entry, bestHtml)) bestHtml = entry;
    }
  }

  if (!bestMarkdown && !bestHtml) return null;
  if (!bestHtml) return 'markdown';
  if (!bestMarkdown) return 'html';

  if (bestMarkdown.q > bestHtml.q) return 'markdown';
  if (bestHtml.q > bestMarkdown.q) return 'html';

  if (bestMarkdown.order < bestHtml.order) return 'markdown';
  if (bestHtml.order < bestMarkdown.order) return 'html';

  return 'html';
}

export function parseAcceptHeader(
  headers: Headers,
): MediaTypePreference[] {
  if (headers instanceof Headers) {
    const value = headers.get('accept');
    if (!value) return [];

    return value
      .split(',')
      .map((part, index) => {
        const [type, ...params] = part.trim().split(';');
        const mediaType = type.toLowerCase();
        let q = 1;

        for (const param of params) {
          const [key, paramValue] = param.trim().split('=');
          if (key.toLowerCase() === 'q' && paramValue) {
            const parsed = Number.parseFloat(paramValue);
            if (!Number.isNaN(parsed)) {
              q = Math.min(Math.max(parsed, 0), 1);
            }
          }
        }

        return {
          value: mediaType,
          q,
          order: index,
        } satisfies MediaTypePreference;
      })
      .filter((entry) => entry.value.length > 0);
  }

  return [];
}

function isBetter(a: MediaTypePreference, b: MediaTypePreference) {
  return a.q > b.q || (a.q === b.q && a.order < b.order);
}

