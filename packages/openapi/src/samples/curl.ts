import { generateSample, type Endpoint } from '.';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];

  s.push(`curl -X ${endpoint.method} "${endpoint.url}"`);

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      const value = generateSample(endpoint.method, param.schema);
      const header = `${param.name}: ${getValue(value)}`;

      s.push(`-H "${header}"`);
    }

    if (param.in === 'formData') {
      console.log('Request example for form data is not supported');
    }
  }

  if (endpoint.body) s.push(`-d '${getValue(endpoint.body)}'`);

  return s.join(' \\\n  ');
}

function getValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
