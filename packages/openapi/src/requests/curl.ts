'use client';
import { inputToString } from '@/utils/input-to-string';
import {
  getUrl,
  ident,
  MediaTypeFormatMap,
  type RequestData,
} from '@/requests/_shared';

export function getSampleRequest(url: string, data: RequestData): string {
  const s: string[] = [];
  s.push(`curl -X ${data.method} "${getUrl(url, data)}"`);

  for (const header in data.header) {
    const value = `${header}: ${data.header[header]}`;

    s.push(`-H "${value}"`);
  }

  for (const cookie in data.cookie) {
    const value = JSON.stringify(`${cookie}=${data.cookie[cookie]}`);

    s.push(`--cookie ${value}`);
  }

  if (data.bodyMediaType === 'multipart/form-data') {
    if (data.body && typeof data.body === 'object') {
      for (const [key, value] of Object.entries(data.body)) {
        s.push(`-F ${key}=${inputToString(value)}`);
      }
    }
  } else if (data.body && data.bodyMediaType) {
    s.push(`-H "Content-Type: ${data.bodyMediaType}"`);

    s.push(
      `-d ${inputToString(
        data.body,
        MediaTypeFormatMap[data.bodyMediaType],
        'single-quote',
      )}`,
    );
  }

  return s.flatMap((v, i) => ident(v, i > 0 ? 1 : 0)).join(' \\\n');
}
