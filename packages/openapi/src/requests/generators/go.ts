import { doubleQuote, indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { resolveMediaAdapter } from '@/requests/media/adapter';

export const go: CodeUsageGenerator = {
  label: 'Go',
  lang: 'go',
  generate(url, data, { mediaAdapters }) {
    const imports = ['fmt', 'net/http', 'io/ioutil'];
    const headers = new Map<string, string>();
    const variables = new Map<string, string>();
    variables.set('url', doubleQuote(url));

    for (const header in data.header) {
      headers.set(header, doubleQuote(data.header[header].value));
    }

    const cookies = Object.entries(data.cookie);
    if (cookies.length > 0) {
      headers.set(
        'Cookie',
        doubleQuote(cookies.map(([k, param]) => `${k}=${param.value}`).join('; ')),
      );
    }

    let body: string | undefined;

    if (data.body && data.bodyMediaType) {
      const adapter = resolveMediaAdapter(data.bodyMediaType, mediaAdapters);
      headers.set('Content-Type', `"${data.bodyMediaType}"`);
      body = adapter?.generateExample(data as { body: unknown }, {
        lang: 'go',
        addImport(from) {
          imports.push(from);
        },
      });
    }

    return `package main

import (
${indent(imports.map((v) => `"${v}"`).join('\n'))}
)

func main() {
${Array.from(variables.entries())
  .map(([k, v]) => indent(`${k} := ${v}`))
  .join('\n')}
${body ? indent(body) : ''}
  req, _ := http.NewRequest("${data.method.toUpperCase()}", url, ${body ? 'body' : 'nil'})
${indent(
  Array.from(headers.entries())
    .map(([key, value]) => `req.Header.Add("${key}", ${value})`)
    .join('\n'),
)}
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  body, _ := ioutil.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(body))
}`;
  },
};
