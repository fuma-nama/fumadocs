'use client';
import { inputToString } from '@/utils/input-to-string';
import { getUrl, ident, type RequestData } from '@/requests/_shared';

export function getSampleRequest(url: string, data: RequestData): string {
  const s: string[] = [];
  const options = new Map<string, string>();
  const headers = { ...data.header };

  if (Object.keys(data.cookie).length > 0) {
    headers['cookie'] = Object.entries(data.cookie)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  if (Object.keys(headers).length > 0) {
    options.set(
      'headers',
      JSON.stringify(headers, null, 2).replaceAll('\n', '\n  '),
    );
  }

  if (data.bodyMediaType === 'multipart/form-data' && data.body) {
    s.push(`const formData = new FormData();`);

    for (const [key, value] of Object.entries(data.body))
      s.push(`formData.set(${key}, ${inputToString(value)})`);

    options.set('body', 'formData');
  } else if (
    data.body &&
    data.bodyMediaType === 'application/x-www-form-urlencoded'
  ) {
    options.set(
      'body',
      `new URLSearchParams(${JSON.stringify(data.body, null, 2)})`,
    );
  } else if (data.body) {
    let code: string;

    if (data.bodyMediaType === 'application/json') {
      code =
        typeof data.body === 'string'
          ? inputToString(data.body, 'json', 'backtick')
          : `JSON.stringify(${JSON.stringify(data.body, null, 2)})`;
    } else {
      code = inputToString(data.body, 'xml', 'backtick');
    }

    options.set('body', code);
  }

  const optionsStr = Array.from(options.entries())
    .map(([k, v]) => ident(`${k}: ${v}`))
    .join(',\n');

  s.push(`fetch(${JSON.stringify(getUrl(url, data))}, {\n${optionsStr}\n});`);

  return s.join('\n\n');
}
