'use client';
import { inputToString } from '@/utils/input-to-string';
import type { RequestData } from '@/ui/contexts/code-example';
import { getUrl } from '@/requests/_shared';

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
  } else if (data.body) {
    s.push(`-H "Content-Type: ${data.bodyMediaType}"`);
    s.push(
      `-d ${inputToString(data.body, data.bodyMediaType, 'single-quote')}`,
    );
  }

  return s
    .flatMap((v, i) =>
      v
        .split('\n')
        .map((line) => (i > 0 ? `  ${line}` : line))
        .join('\n'),
    )
    .join(' \\\n');
}
