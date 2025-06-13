'use client';
import { inputToString } from '@/utils/input-to-string';
import { ident, type SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

const MediaTypeFormatMap = {
  'application/json': 'json',
  'application/xml': 'xml',
  'application/x-www-form-urlencoded': 'url',
} as const;

export const generator: SampleGenerator = (url, data) => {
  const s: string[] = [];
  s.push(`curl -X ${data.method} "${resolveRequestData(url, data)}"`);

  for (const header in data.header) {
    const value = `${header}: ${data.header[header]}`;

    s.push(`-H "${value}"`);
  }

  for (const cookie in data.cookie) {
    const value = JSON.stringify(`${cookie}=${data.cookie[cookie]}`);

    s.push(`--cookie ${value}`);
  }

  if (data.body && data.bodyMediaType === 'multipart/form-data') {
    if (typeof data.body !== 'object')
      throw new Error('[CURL] request body must be an object.');

    for (const [key, value] of Object.entries(data.body)) {
      s.push(`-F ${key}=${inputToString(value)}`);
    }
  } else if (
    data.body &&
    data.bodyMediaType &&
    data.bodyMediaType in MediaTypeFormatMap
  ) {
    s.push(`-H "Content-Type: ${data.bodyMediaType}"`);

    s.push(
      `-d ${inputToString(
        data.body,
        MediaTypeFormatMap[
          data.bodyMediaType as keyof typeof MediaTypeFormatMap
        ],
        "'",
      )}`,
    );
  }

  return s.flatMap((v, i) => ident(v, i > 0 ? 1 : 0)).join(' \\\n');
};
