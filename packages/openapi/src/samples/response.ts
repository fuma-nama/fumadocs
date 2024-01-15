import { generateSample, type Endpoint } from '.';

export function getExampleResponse(
  endpoint: Endpoint,
  code: string,
): string | undefined {
  if (code in endpoint.responses) {
    const value = generateSample(
      endpoint.method,
      endpoint.responses[code].schema,
    );

    return JSON.stringify(value, null, 2);
  }
}
