import { shellQuote } from 'shared-api/codegen';
import { inputToString } from '@/requests/string-utils';
import { resolveMediaType } from '@/requests/media/resolve-adapter';
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

    const type = data.bodyMediaType && resolveMediaType(data.bodyMediaType, mediaAdapters);
    if (data.body && type === 'multipart/form-data') {
      if (typeof data.body !== 'object') throw new Error('[CURL] request body must be an object.');

      for (const [key, value] of Object.entries(data.body)) {
        s.push(`-F ${shellQuote(`${key}=${inputToString(value)}`)}`);
      }
    } else if (data.body && type) {
      s.push(`-H 'Content-Type: ${data.bodyMediaType}'`);
      s.push(`-d ${shellQuote(inputToString(data.body, type))}`);
    }

    return s.join(' \\\n  ');
  },
};
