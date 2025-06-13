'use client';
import { ident, SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const imports = ['fmt', 'net/http', 'io/ioutil'];
  const headers = new Map<string, string>();
  const variables = new Map<string, string>();
  variables.set('url', JSON.stringify(resolveRequestData(url, data)));

  for (const header in data.header) {
    headers.set(header, JSON.stringify(data.header[header]));
  }

  const cookies = Object.keys(data.cookie);
  if (cookies.length > 0)
    headers.set(
      'Cookie',
      JSON.stringify(cookies.map((p) => `${p}=${data.cookie[p]}`).join('; ')),
    );

  let body: string | undefined;

  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    headers.set('Content-Type', `"${data.bodyMediaType}"`);
    body = mediaAdapters[data.bodyMediaType].generateExample(data, {
      lang: 'go',
      addImport(from) {
        imports.push(from);
      },
    });
  }

  return `package main

import (
${ident(imports.map((v) => `"${v}"`).join('\n'))}
)

func main() {
${Array.from(variables.entries())
  .map(([k, v]) => ident(`${k} := ${v}`))
  .join('\n')}
${body ? ident(body) : ''}
  req, _ := http.NewRequest("${data.method}", url, ${body ? 'body' : 'nil'})
${ident(
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
};
