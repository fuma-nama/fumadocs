import { type Endpoint } from '@/endpoint';
import { generateInput } from '@/utils/generate-input';

export function getSampleRequest(endpoint: Endpoint): string {
  const s: string[] = [];
  const options = new Map<string, string>();
  const headers: Record<string, unknown> = {};

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      headers[param.name] = generateInput(endpoint.method, param.schema);
    }
  }

  options.set('method', JSON.stringify(endpoint.method));

  if (Object.keys(headers).length > 0) {
    options.set('headers', JSON.stringify(headers, undefined, 2));
  }

  if (
    endpoint.body?.mediaType === 'multipart/form-data' &&
    typeof endpoint.body.sample === 'object' &&
    endpoint.body.sample
  ) {
    s.push(`const formData = new FormData();`);

    for (const [key, value] of Object.entries(endpoint.body.sample))
      s.push(`formData.set(${key}, ${JSON.stringify(value)})`);

    options.set('body', 'formData');
  } else if (endpoint.body) {
    options.set(
      'body',
      `JSON.stringify(${JSON.stringify(endpoint.body.sample, null, 2)
        .split('\n')
        .map((v, i) => (i > 0 ? `  ${v}` : v))
        .join('\n')})`,
    );
  }

  const optionsStr = Array.from(options.entries())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join(',\n');

  s.push(`fetch(${JSON.stringify(endpoint.url)}, {\n${optionsStr}\n});`);

  return s.join('\n\n');
}
