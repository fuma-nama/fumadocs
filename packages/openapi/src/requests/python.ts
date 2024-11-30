import { type EndpointSample } from '@/utils/generate-sample';

export function getSampleRequest(endpoint: EndpointSample): string {
  const headers = new Map<string, unknown>();
  const cookies = new Map<string, unknown>();
  const variables = new Map<string, string>();

  for (const param of endpoint.parameters) {
    if (param.in === 'header') headers.set(param.name, param.sample);
    if (param.in === 'cookie') cookies.set(param.name, param.sample);
  }

  if (headers.size > 0) {
    variables.set(
      'headers',
      JSON.stringify(Object.fromEntries(headers.entries()), null, 2),
    );
  }

  if (cookies.size > 0) {
    variables.set(
      'cookies',
      JSON.stringify(Object.fromEntries(cookies.entries()), null, 2),
    );
  }

  if (endpoint.body) {
    variables.set(
      endpoint.body.mediaType === 'multipart/form-data' ? 'data' : 'json',
      JSON.stringify(endpoint.body.sample, null, 2),
    );
  }

  return `import requests

url = ${JSON.stringify(endpoint.url)}
${Array.from(variables.entries())
  .map(([k, v]) => `${k} = ${v}`)
  .join('\n')}
response = requests.request("${endpoint.method}", url${
    variables.size > 0
      ? `, ${Array.from(variables.keys())
          .map((k) => `${k}=${k}`)
          .join(', ')}`
      : ''
  })

print(response.text)`;
}
