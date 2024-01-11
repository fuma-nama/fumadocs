import type { Endpoint } from '.';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];
  let url = endpoint.url;
  const query = new URLSearchParams();

  for (const param of endpoint.parameters) {
    if (param.in === 'query') query.append(param.name, getValue(param.value));

    if (param.in === 'path')
      url = url.replace(`{${param.name}}`, getValue(param.value));
  }

  url = `${url}?${query.toString()}`;
  s.push(`curl -X ${endpoint.method} ${JSON.stringify(url)}`);

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      const header = `${param.name}: ${getValue(param.value)}`;

      s.push(`-H "${header}"`);
    }

    if (param.in === 'formData')
      console.log('Request example for form data is not supported');
  }

  if (endpoint.body) s.push(`-d '${getValue(endpoint.body)}'`);

  return s.join(' \\\n  ');
}

function getValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
