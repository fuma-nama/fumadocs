import { type Endpoint } from '@/endpoint';
import { generateInput } from '@/utils/generate-input';
import { toSampleInput } from '@/utils/schema';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];

  s.push(`curl -X ${endpoint.method} "${endpoint.url}"`);

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      const value = generateInput(endpoint.method, param.schema);
      const header = `${param.name}: ${toSampleInput(value)}`;

      s.push(`-H "${header}"`);
    }

    if (param.in === 'formData') {
      console.log('Request example for form data is not supported');
    }
  }

  if (endpoint.body) s.push(`-d '${toSampleInput(endpoint.body)}'`);

  return s.join(' \\\n  ');
}
