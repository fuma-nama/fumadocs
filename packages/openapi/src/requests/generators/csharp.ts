import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';
import { cookieString, doubleQuote, standardMethods } from '@/requests/string-utils';

export const csharp: CodeUsageGenerator = {
  label: 'C#',
  lang: 'csharp',
  generate(data, { mediaAdapters }) {
    const imports = new Set(['System', 'System.Net.Http', 'System.Text']);
    const body = generateBodyExample(data, mediaAdapters, {
      lang: 'csharp',
      addImport: (name) => imports.add(name),
    });
    const s = Array.from(imports, (name) => `using ${name};`);

    s.push('');
    if (body) s.push(body, '');
    s.push('var client = new HttpClient();');
    for (const k in data.header) {
      s.push(
        `client.DefaultRequestHeaders.Add(${doubleQuote(k)}, ${doubleQuote(data.header[k].value)});`,
      );
    }

    const cookie = cookieString(data.cookie);
    if (cookie) s.push(`client.DefaultRequestHeaders.Add("cookie", ${doubleQuote(cookie)});`);

    const method = standardMethods.has(data.method)
      ? `HttpMethod.${data.method[0].toUpperCase()}${data.method.slice(1)}`
      : `new HttpMethod(${doubleQuote(data.method.toUpperCase())})`;
    const content = body ? ' { Content = body }' : '';
    s.push(
      `var request = new HttpRequestMessage(${method}, ${doubleQuote(data.url)})${content};`,
      'var response = await client.SendAsync(request);',
      'var responseBody = await response.Content.ReadAsStringAsync();',
    );

    return s.join('\n');
  },
};
