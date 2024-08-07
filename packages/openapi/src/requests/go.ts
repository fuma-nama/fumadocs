import { type EndpointSample } from '@/schema/sample';
import { toSampleInput } from '@/utils/schema';

export function getSampleRequest(endpoint: EndpointSample): string {
  const imports = ['fmt', 'net/http', 'io/ioutil'];
  const headers = new Map<string, string>();
  const cookies = new Map<string, string>();
  const variables = new Map<string, string>();

  // additional lines before initializing request
  const additional: string[] = [];

  for (const p of endpoint.parameters) {
    if (p.in === 'header') headers.set(p.name, JSON.stringify(p.sample));
    if (p.in === 'cookie') cookies.set(p.name, toSampleInput(p.sample));
  }

  variables.set('url', JSON.stringify(endpoint.url));

  if (cookies.size > 0)
    headers.set(
      'Cookie',
      JSON.stringify(
        Array.from(cookies.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join('; '),
      ),
    );

  if (endpoint.body) {
    headers.set('Content-Type', `"${endpoint.body.mediaType}"`);

    if (endpoint.body.mediaType === 'application/json') {
      imports.push('strings');
      variables.set(
        'payload',
        `strings.NewReader(\`${JSON.stringify(
          endpoint.body.sample,
          null,
          2,
        ).replaceAll('\n', '\n  ')}\`)`,
      );
    }
    if (
      endpoint.body.mediaType === 'multipart/form-data' &&
      typeof endpoint.body.sample === 'object'
    ) {
      imports.push('mime/multipart', 'bytes');

      variables.set('payload', `new(bytes.Buffer)`);
      variables.set('mp', 'multipart.NewWriter(payload)');

      for (const [key, value] of Object.entries(endpoint.body.sample ?? {})) {
        additional.push(
          `mp.WriteField("${key}", ${JSON.stringify(toSampleInput(value))})`,
        );
      }
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
  req, _ := http.NewRequest("${endpoint.method}", url, ${variables.has('payload') ? 'payload' : 'nil'})
  ${Array.from(headers.entries())
    .map(([key, value]) => `req.Header.Add("${key}", ${value})`)
    .join('\n')}
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  body, _ := ioutil.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(body))
}`;
}
