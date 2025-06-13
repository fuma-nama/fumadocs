'use client';
import { type SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const headers = { ...data.header };
  const params = [`"${data.method}"`, 'url'];
  let body: string | undefined;

  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    headers['Content-Type'] = data.bodyMediaType;

    body = mediaAdapters[data.bodyMediaType].generateExample(data, {
      lang: 'python',
    });

    if (body && data.bodyMediaType === 'application/json') {
      params.push('json = body');
    } else if (body) {
      params.push('data = body');
    }
  }

  if (Object.keys(headers).length > 0) {
    params.push(`headers = ${JSON.stringify(headers, null, 2)}`);
  }

  if (Object.keys(data.cookie).length > 0) {
    params.push(`cookies = ${JSON.stringify(data.cookie, null, 2)}`);
  }

  return `import requests

url = ${JSON.stringify(resolveRequestData(url, data))}
${body ?? ''}
response = requests.request(${params.join(', ')})

print(response.text)`;
};
