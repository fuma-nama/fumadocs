import { type Endpoint } from '@/endpoint';
import { toSampleInput } from '@/utils/schema';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];

  s.push(`curl -X ${endpoint.method} "${endpoint.url}"`);

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      const header = `${param.name}: ${toSampleInput(param.sample)}`;

      s.push(`-H "${header}"`);
    }
  }

  if (endpoint.body?.mediaType === 'multipart/form-data')
    console.warn("Curl sample with form data body isn't supported.");
  if (endpoint.body) s.push(`-d '${toSampleInput(endpoint.body.sample)}'`);

  return s.join(' \\\n  ');
}
