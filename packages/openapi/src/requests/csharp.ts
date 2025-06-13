'use client';
import type { SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const s: string[] = [];
  const imports = new Set<string>(['System', 'System.Net.Http', 'System.Text']);
  const headers = { ...data.header };

  // Handle request body
  let body: string | undefined;
  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    body = mediaAdapters[data.bodyMediaType].generateExample(data, {
      lang: 'csharp',
      addImport(from) {
        imports.add(from);
      },
    });
  }

  for (const specifier of imports) {
    s.push(`using ${specifier};`);
  }

  s.push('');

  if (body) {
    s.push(body, '');
  }

  s.push('var client = new HttpClient();');

  // Add cookie header if cookies are present
  if (Object.keys(data.cookie).length > 0) {
    headers['cookie'] = Object.entries(data.cookie)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  // Add headers
  const headerLines = Object.entries(headers).map(
    ([key, value]) =>
      `client.DefaultRequestHeaders.Add("${key}", ${JSON.stringify(value)});`,
  );

  s.push(...headerLines);

  // Build the request
  const resolvedUrl = resolveRequestData(url, data);
  const method =
    data.method[0].toUpperCase() + data.method.slice(1).toLowerCase() + 'Async';

  if (body) {
    s.push(`var response = await client.${method}("${resolvedUrl}", body);`);
  } else {
    s.push(`var response = await client.${method}("${resolvedUrl}");`);
  }

  // Add response handling
  s.push('var responseBody = await response.Content.ReadAsStringAsync();');

  return s.join('\n');
};
