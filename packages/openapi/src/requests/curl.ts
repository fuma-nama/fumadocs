import { type EndpointSample } from '@/utils/generate-sample';
import { inputToString } from '@/utils/input-to-string';

export function getSampleRequest(
  endpoint: EndpointSample,
  sampleKey: string,
): string {
  const s: string[] = [];

  s.push(`curl -X ${endpoint.method} "${endpoint.url}"`);

  for (const param of endpoint.parameters) {
    if (param.in === 'header') {
      const header = `${param.name}: ${param.sample}`;

      s.push(`-H "${header}"`);
    }

    if (param.in === 'cookie') {
      const cookie = JSON.stringify(`${param.name}=${param.sample}`);

      s.push(`--cookie ${cookie}`);
    }
  }

  if (endpoint.body?.mediaType === 'multipart/form-data') {
    const sample = endpoint.body.samples[sampleKey]?.value;

    if (sample && typeof sample === 'object') {
      for (const [key, value] of Object.entries(sample)) {
        s.push(`-F ${key}=${inputToString(value)}`);
      }
    }
  } else if (endpoint.body) {
    s.push(`-H "Content-Type: ${endpoint.body.mediaType}"`);
    s.push(
      `-d ${inputToString(endpoint.body.samples[sampleKey]?.value ?? '', endpoint.body.mediaType, 'single-quote')}`,
    );
  }

  return s
    .flatMap((v, i) =>
      v
        .split('\n')
        .map((line) => (i > 0 ? `  ${line}` : line))
        .join('\n'),
    )
    .join(' \\\n');
}
