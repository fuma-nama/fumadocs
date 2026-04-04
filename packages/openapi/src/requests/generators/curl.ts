import { doubleQuote, indent, inputToString, singleQuote } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';

export const curl: CodeUsageGenerator = {
  label: 'cURL',
  lang: 'bash',
  generate(url, data) {
    const s: string[] = [];
    s.push(`curl -X ${data.method.toUpperCase()} "${url}"`);

    for (const header in data.header) {
      const value = `${header}: ${data.header[header].value}`;

      s.push(`-H "${value}"`);
    }

    for (const k in data.cookie) {
      const param = data.cookie[k];

      s.push(`--cookie ${doubleQuote(`${k}=${param.value}`)}`);
    }

    if (data.body && data.bodyMediaType === 'multipart/form-data') {
      if (typeof data.body !== 'object') throw new Error('[CURL] request body must be an object.');

      for (const [key, value] of Object.entries(data.body)) {
        s.push(`-F ${key}=${doubleQuote(inputToString(value))}`);
      }
    } else if (data.body && data.bodyMediaType) {
      const escaped = singleQuote(
        inputToString(
          data.body,
          // @ts-expect-error -- assume the body media type is supported
          data.bodyMediaType,
        ),
      );

      s.push(`-H "Content-Type: ${data.bodyMediaType}"`);
      s.push(`-d ${escaped}`);
    }

    return s.flatMap((v, i) => indent(v, i > 0 ? 1 : 0)).join(' \\\n');
  },
};
