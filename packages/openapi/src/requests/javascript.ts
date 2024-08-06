import { type EndpointSample } from '@/create-sample';
import { toSampleInput } from '@/utils/schema';

export function getSampleRequest(endpoint: EndpointSample): string {
  const s: string[] = [];
  const options = new Map<string, string>();
  const headers = new Map<string, unknown>();
  const cookies = new Map<string, unknown>();

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      headers.set(param.name, param.sample);
    }

    if (param.in === 'cookie') {
      cookies.set(param.name, param.sample);
    }
  }

  if (cookies.size > 0) {
    headers.set(
      'cookie',
      Array.from(cookies.entries())
        .map(([key, value]) => `${key}=${toSampleInput(value)}`)
        .join('; '),
    );
  }

  if (headers.size > 0) {
    options.set(
      'headers',
      JSON.stringify(
        Object.fromEntries(headers.entries()),
        undefined,
        2,
      ).replaceAll('\n', '\n  '),
    );
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
      `JSON.stringify(${JSON.stringify(
        endpoint.body.sample,
        null,
        2,
      ).replaceAll('\n', '\n  ')})`,
    );
  }

  const optionsStr = Array.from(options.entries())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join(',\n');

  s.push(`fetch(${JSON.stringify(endpoint.url)}, {\n${optionsStr}\n});`);

  return s.join('\n\n');
}
