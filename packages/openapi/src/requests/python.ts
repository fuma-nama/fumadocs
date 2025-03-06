'use client';
import { inputToString } from '@/utils/input-to-string';
import type { RequestData } from '@/ui/contexts/code-example';
import { getUrl } from '@/requests/_shared';

export function getSampleRequest(url: string, data: RequestData): string {
  const variables = new Map<string, string>();
  const headers = { ...data.header };

  if (data.body) {
    switch (data.bodyMediaType) {
      case 'application/json':
        variables.set('json', JSON.stringify(data.body, null, 2));
        break;
      case 'multipart/form-data':
        headers['Content-Type'] = data.bodyMediaType;
        variables.set('data', JSON.stringify(data.body, null, 2));
        break;
      default:
        if (data.bodyMediaType) headers['Content-Type'] = data.bodyMediaType;

        variables.set(
          'data',
          inputToString(data.body, data.bodyMediaType, 'python'),
        );
    }
  }

  if (Object.keys(headers).length > 0) {
    variables.set('headers', JSON.stringify(headers, null, 2));
  }

  if (Object.keys(data.cookie).length > 0) {
    variables.set('cookies', JSON.stringify(data.cookie, null, 2));
  }

  return `import requests

url = ${JSON.stringify(getUrl(url, data))}
${Array.from(variables.entries())
  .map(([k, v]) => `${k} = ${v}`)
  .join('\n')}
response = requests.request("${data.method}", url${
    variables.size > 0
      ? `, ${Array.from(variables.keys())
          .map((k) => `${k}=${k}`)
          .join(', ')}`
      : ''
  })

print(response.text)`;
}
