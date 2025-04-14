'use client';
import { inputToString } from '@/utils/input-to-string';
import {
  getUrl,
  MediaTypeFormatMap,
  type RequestData,
} from '@/requests/_shared';

export function getSampleRequest(url: string, data: RequestData): string {
  const variables = new Map<string, string>();
  const headers = { ...data.header };

  if (data.body && data.bodyMediaType) {
    switch (data.bodyMediaType) {
      case 'application/json':
        variables.set('json', JSON.stringify(data.body, null, 2));
        break;
      case 'multipart/form-data':
        headers['Content-Type'] = data.bodyMediaType;
        variables.set('data', JSON.stringify(data.body, null, 2));
        break;
      default:
        headers['Content-Type'] = data.bodyMediaType;

        variables.set(
          'data',
          inputToString(
            data.body,
            MediaTypeFormatMap[data.bodyMediaType],
            'python',
          ),
        );
    }
  }

  if (Object.keys(headers).length > 0) {
    variables.set('headers', JSON.stringify(headers, null, 2));
  }

  if (Object.keys(data.cookie).length > 0) {
    variables.set('cookies', JSON.stringify(data.cookie, null, 2));
  }

  const params = [
    `"${data.method}"`,
    'url',
    ...Array.from(variables.keys()).map((k) => `${k}=${k}`),
  ];

  return `import requests

url = ${JSON.stringify(getUrl(url, data))}
${Array.from(variables.entries())
  .map(([k, v]) => `${k} = ${v}`)
  .join('\n')}
response = requests.request(${params.join(', ')})

print(response.text)`;
}
