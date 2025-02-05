import { type EndpointSample } from '@/utils/generate-sample';
import { inputToString } from '@/utils/input-to-string';

export function getSampleRequest(
  endpoint: EndpointSample,
  sampleKey: string,
): string {
  const imports = ['fmt', 'net/http', 'io/ioutil'];
  const headers = new Map<string, string>();
  const variables = new Map<string, string>();

  // additional lines before initializing request
  const additional: string[] = [];

  for (const p of endpoint.parameters) {
    if (p.in === 'header') headers.set(p.name, JSON.stringify(p.sample));
  }

  const cookies = endpoint.parameters.filter((p) => p.in === 'cookie');

  variables.set('url', JSON.stringify(endpoint.url));

  if (cookies.length > 0)
    headers.set(
      'Cookie',
      JSON.stringify(cookies.map((p) => `${p.name}=${p.sample}`).join('; ')),
    );

  if (endpoint.body) {
    headers.set('Content-Type', `"${endpoint.body.mediaType}"`);

    if (
      endpoint.body.mediaType === 'multipart/form-data' &&
      typeof endpoint.body.samples[sampleKey]?.value === 'object'
    ) {
      imports.push('mime/multipart', 'bytes');

      variables.set('payload', `new(bytes.Buffer)`);
      variables.set('mp', 'multipart.NewWriter(payload)');

      for (const [key, value] of Object.entries(
        endpoint.body.samples[sampleKey]?.value ?? {},
      )) {
        additional.push(
          `mp.WriteField("${key}", ${inputToString(value, undefined, 'backtick')})`,
        );
      }
    } else {
      imports.push('strings');
      variables.set(
        'payload',
        `strings.NewReader(${inputToString(
          endpoint.body.samples[sampleKey]?.value ?? '',
          endpoint.body.mediaType,
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
  req, _ := http.NewRequest("${endpoint.method}", url, ${variables.has('payload') ? 'payload' : 'nil'})
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
