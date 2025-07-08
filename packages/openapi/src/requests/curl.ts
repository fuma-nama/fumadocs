'use client';
import { escapeString, inputToString } from '@/utils/input-to-string';
import { ident, type SampleGenerator } from '@/requests/_shared';

export const generator: SampleGenerator = (url, data) => {
  const s: string[] = [];
  s.push(`curl -X ${data.method} "${url}"`);

  for (const header in data.header) {
    const value = `${header}: ${data.header[header].value}`;

    s.push(`-H "${value}"`);
  }

  for (const k in data.cookie) {
    const param = data.cookie[k];

    s.push(`--cookie ${JSON.stringify(`${k}=${param.value}`)}`);
  }

  if (data.body && data.bodyMediaType === 'multipart/form-data') {
    if (typeof data.body !== 'object')
      throw new Error('[CURL] request body must be an object.');

    for (const [key, value] of Object.entries(data.body)) {
      s.push(`-F ${key}=${JSON.stringify(inputToString(value))}`);
    }
  } else if (data.body && data.bodyMediaType) {
    const escaped = escapeString(
      inputToString(
        data.body,
        // @ts-expect-error -- assume the body media type is supported
        data.bodyMediaType,
      ),
      "'",
    );

    s.push(`-H "Content-Type: ${data.bodyMediaType}"`);
    s.push(`-d ${escaped}`);
  }

  return s.flatMap((v, i) => ident(v, i > 0 ? 1 : 0)).join(' \\\n');
};
