import { inputToString } from '@/requests/string-utils';
import { resolveMediaAdapter } from '@/requests/media/resolve-adapter';
import type { CodeUsageGenerator } from '@/requests/generators';

export const curl: CodeUsageGenerator = {
  label: 'cURL',
  lang: 'bash',
  generate(data, { mediaAdapters }) {
    const s: string[] = [];
    s.push(`curl -X ${data.method.toUpperCase()} ${shellQuote(data.url)}`);

    for (const header in data.header) {
      s.push(`-H ${shellQuote(`${header}: ${data.header[header].value}`)}`);
    }

    for (const k in data.cookie) {
      s.push(`--cookie ${shellQuote(`${k}=${data.cookie[k].value}`)}`);
    }

    if (data.body && data.bodyMediaType === 'multipart/form-data') {
      if (typeof data.body !== 'object') throw new Error('[CURL] request body must be an object.');

      for (const [key, value] of Object.entries(data.body)) {
        s.push(`-F ${shellQuote(`${key}=${inputToString(value)}`)}`);
      }
    } else if (
      data.body &&
      data.bodyMediaType &&
      resolveMediaAdapter(data.bodyMediaType, mediaAdapters)
    ) {
      const escaped = shellQuote(
        inputToString(
          data.body,
          // @ts-expect-error -- assume the body media type is supported
          data.bodyMediaType,
        ),
      );

      s.push(`-H 'Content-Type: ${data.bodyMediaType}'`);
      s.push(`-d ${escaped}`);
    }

    return s.join(' \\\n  ');
  },
};

/** single quotes keep the string literal, each `'` closes them to add an escaped quote */
function shellQuote(str: string): string {
  return `'${str.replaceAll("'", `'\\''`)}'`;
}
