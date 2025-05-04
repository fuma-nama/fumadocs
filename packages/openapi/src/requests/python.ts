'use client';
import { getUrl, type SampleGenerator } from '@/requests/_shared';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const headers = { ...data.header };
  const params = [`"${data.method}"`, 'url'];
  let body: string | undefined;

  if (data.body && data.bodyMediaType) {
    if (data.bodyMediaType === 'application/json') {
      params.push(`json = ${JSON.stringify(data.body, null, 2)}`);
    } else if (data.bodyMediaType === 'multipart/form-data') {
      headers['Content-Type'] = data.bodyMediaType;

      params.push(`data = ${JSON.stringify(data.body, null, 2)}`);
    } else if (data.bodyMediaType in mediaAdapters) {
      headers['Content-Type'] = data.bodyMediaType;

      body = mediaAdapters[data.bodyMediaType].generateExample(data, {
        lang: 'python',
      });

      if (body) {
        params.push('data = body');
      }
    }
  }

  if (Object.keys(headers).length > 0) {
    params.push(`headers = ${JSON.stringify(headers, null, 2)}`);
  }

  if (Object.keys(data.cookie).length > 0) {
    params.push(`cookies = ${JSON.stringify(data.cookie, null, 2)}`);
  }

  return `import requests

url = ${JSON.stringify(getUrl(url, data))}
${body ?? ''}
response = requests.request(${params.join(', ')})

print(response.text)`;
};
