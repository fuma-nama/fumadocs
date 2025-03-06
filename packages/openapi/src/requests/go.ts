'use client';
import { inputToString } from '@/utils/input-to-string';
import type { RequestData } from '@/ui/contexts/code-example';
import { getUrl } from '@/requests/_shared';

export function getSampleRequest(url: string, data: RequestData): string {
  const imports = ['fmt', 'net/http', 'io/ioutil'];
  const headers = new Map<string, string>();
  const variables = new Map<string, string>();
  variables.set('url', JSON.stringify(getUrl(url, data)));

  // additional lines before initializing request
  const additional: string[] = [];

  for (const header in data.header) {
    headers.set(header, JSON.stringify(data.header[header]));
  }

  const cookies = Object.keys(data.cookie);
  if (cookies.length > 0)
    headers.set(
      'Cookie',
      JSON.stringify(cookies.map((p) => `${p}=${data.cookie[p]}`).join('; ')),
    );

  if (data.body) {
    headers.set('Content-Type', `"${data.bodyMediaType}"`);

    if (
      data.bodyMediaType === 'multipart/form-data' &&
      typeof data.body === 'object'
    ) {
      imports.push('mime/multipart', 'bytes');

      variables.set('payload', `new(bytes.Buffer)`);
      variables.set('mp', 'multipart.NewWriter(payload)');

      for (const [key, value] of Object.entries(data.body)) {
        additional.push(
          `mp.WriteField("${key}", ${inputToString(value, undefined, 'backtick')})`,
        );
      }
    } else {
      imports.push('strings');
      variables.set(
        'payload',
        `strings.NewReader(${inputToString(
          data.body,
          data.bodyMediaType,
          'backtick',
        ).replaceAll('\n', '\n  ')})`,
      );
    }
  }

  return `package main

import (
${imports.map((v) => `  "${v}"`).join('\n')}
)

func main() {
${Array.from(variables.entries())
  .map(([k, v]) => `  ${k} := ${v}`)
  .join('\n')}
  ${additional.join('\n  ')}
  req, _ := http.NewRequest("${data.method}", url, ${variables.has('payload') ? 'payload' : 'nil'})
  ${Array.from(headers.entries())
    .map(([key, value]) => `req.Header.Add("${key}", ${value})`)
    .join('\n  ')}
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  body, _ := ioutil.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(body))
}`;
}
