'use client';
import { type SampleGenerator } from '@/requests/_shared';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const headers: Record<string, string> = {};
  const params = [`"${data.method}"`, 'url'];
  let body: string | undefined;

  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    headers['Content-Type'] = data.bodyMediaType;

    body = mediaAdapters[data.bodyMediaType].generateExample(
      data as { body: unknown },
      {
        lang: 'python',
      },
    );

    if (body && data.bodyMediaType === 'application/json') {
      params.push('json = body');
    } else if (body) {
      params.push('data = body');
    }
  }

  for (const [k, v] of Object.entries(data.header)) {
    headers[k] = v.value as string;
  }

  if (Object.keys(headers).length > 0) {
    params.push(`headers = ${JSON.stringify(headers, null, 2)}`);
  }

  const inputCookies = Object.entries(data.cookie);
  if (inputCookies.length > 0) {
    const cookies: Record<string, string> = {};

    for (const [k, v] of inputCookies) {
      cookies[k] = v.value as string;
    }

    params.push(`cookies = ${JSON.stringify(cookies, null, 2)}`);
  }

  return `import requests

url = ${JSON.stringify(url)}
${body ?? ''}
response = requests.request(${params.join(', ')})

print(response.text)`;
};
