'use client';
import type { SampleGenerator } from '@/requests/types';
import { generatePythonObject } from '@/requests/to-python-object';
import { resolveMediaAdapter } from '@/requests/media/adapter';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const headers: Record<string, string> = {};
  const imports = new Set<string>();
  const params = [`"${data.method}"`, 'url'];
  let body: string | undefined;

  imports.add('requests');

  if (data.body && data.bodyMediaType) {
    const adapter = resolveMediaAdapter(data.bodyMediaType, mediaAdapters);
    headers['Content-Type'] = data.bodyMediaType;

    body = adapter?.generateExample(data as { body: unknown }, {
      lang: 'python',
    });

    if (body) {
      params.push('data = body');
    }
  }

  for (const [k, v] of Object.entries(data.header)) {
    headers[k] = v.value as string;
  }

  if (Object.keys(headers).length > 0) {
    params.push(`headers = ${generatePythonObject(headers, imports)}`);
  }

  const inputCookies = Object.entries(data.cookie);
  if (inputCookies.length > 0) {
    const cookies: Record<string, string> = {};

    for (const [k, v] of inputCookies) {
      cookies[k] = v.value as string;
    }

    params.push(`cookies = ${generatePythonObject(cookies, imports)}`);
  }

  return `${Array.from(imports)
    .map((name) => 'import ' + name)
    .join('\n')}

url = ${JSON.stringify(url)}
${body ?? ''}
response = requests.request(${params.join(', ')})

print(response.text)`;
};
