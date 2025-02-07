import { type EndpointSample } from '@/utils/generate-sample';
import { inputToString } from '@/utils/input-to-string';

export function getSampleRequest(
  endpoint: EndpointSample,
  sampleKey: string,
): string {
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
        .map(([key, value]) => `${key}=${value}`)
        .join('; '),
    );
  }

  if (headers.size > 0) {
    options.set(
      'headers',
      JSON.stringify(Object.fromEntries(headers.entries()), null, 2).replaceAll(
        '\n',
        '\n  ',
      ),
    );
  }

  if (
    endpoint.body?.mediaType === 'multipart/form-data' &&
    typeof endpoint.body.samples[sampleKey]?.value === 'object' &&
    endpoint.body.samples[sampleKey]?.value
  ) {
    s.push(`const formData = new FormData();`);

    for (const [key, value] of Object.entries(
      endpoint.body.samples[sampleKey]?.value,
    ))
      s.push(`formData.set(${key}, ${inputToString(value)})`);

    options.set('body', 'formData');
  } else if (endpoint.body) {
    let code: string;

    if (endpoint.body.mediaType === 'application/json') {
      code =
        typeof endpoint.body.samples[sampleKey]?.value === 'string'
          ? inputToString(
              endpoint.body.samples[sampleKey]?.value,
              endpoint.body.mediaType,
              'backtick',
            )
          : `JSON.stringify(${JSON.stringify(endpoint.body.samples[sampleKey]?.value, null, 2)})`;
    } else {
      code = inputToString(
        endpoint.body.samples[sampleKey]?.value ?? '',
        endpoint.body.mediaType,
        'backtick',
      );
    }

    options.set('body', code.replaceAll('\n', '\n  '));
  }

  const optionsStr = Array.from(options.entries())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join(',\n');

  s.push(`fetch(${JSON.stringify(endpoint.url)}, {\n${optionsStr}\n});`);

  return s.join('\n\n');
}
