'use client';
import type { SampleGenerator } from '@/requests/_shared';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const s: string[] = [];
  const imports = new Set<string>(['System', 'System.Net.Http', 'System.Text']);
  const headers = { ...data.header };

  // Handle request body
  let body: string | undefined;
  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    body = mediaAdapters[data.bodyMediaType].generateExample(
      data as { body: unknown },
      {
        lang: 'csharp',
        addImport(from) {
          imports.add(from);
        },
      },
    );
  }

  for (const specifier of imports) {
    s.push(`using ${specifier};`);
  }

  s.push('');

  if (body) {
    s.push(body, '');
  }

  s.push('var client = new HttpClient();');
  const headerLines: string[] = [];

  function addHeader(key: string, value: unknown) {
    headerLines.push(
      `client.DefaultRequestHeaders.Add("${key}", ${JSON.stringify(value)});`,
    );
  }
  for (const k in headers) {
    addHeader(k, headers[k].value);
  }

  // Add cookie header if cookies are present
  if (Object.keys(data.cookie).length > 0) {
    const cookie = Object.entries(data.cookie)
      .map(([key, param]) => `${key}=${param.value}`)
      .join('; ');

    addHeader('cookie', cookie);
  }

  s.push(...headerLines);

  // Build the request
  const method =
    data.method[0].toUpperCase() + data.method.slice(1).toLowerCase() + 'Async';

  if (body) {
    s.push(`var response = await client.${method}("${url}", body);`);
  } else {
    s.push(`var response = await client.${method}("${url}");`);
  }

  // Add response handling
  s.push('var responseBody = await response.Content.ReadAsStringAsync();');

  return s.join('\n');
};
