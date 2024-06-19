import { type Endpoint } from '@/endpoint';
import { generateInput } from '@/utils/generate-input';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];
  const options = new Map<string, string>();
  const headers: Record<string, unknown> = {};
  const formData: Record<string, unknown> = {};

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      headers[param.name] = generateInput(endpoint.method, param.schema);
    }

    if (param.in === 'formData') {
      formData[param.name] = generateInput(endpoint.method, param.schema);
    }
  }

  options.set('method', JSON.stringify(endpoint.method));

  if (Object.keys(headers).length > 0) {
    options.set('headers', JSON.stringify(headers, undefined, 2));
  }

  if (Object.keys(formData).length > 0) {
    s.push(`const formData = new FormData();`);

    for (const [key, value] of Object.entries(formData))
      s.push(`formData.set(${key}, ${JSON.stringify(value)}`);

    options.set('body', 'formData');
  }

  const optionsStr = Array.from(options.entries())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join(',\n');

  s.push(`fetch(${JSON.stringify(endpoint.url)}, {\n${optionsStr}\n});`);

  return s.join('\n\n');
}
