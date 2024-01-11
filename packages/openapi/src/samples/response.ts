import type { Endpoint } from '.';

export function getExampleResponse(
  endpoint: Endpoint,
  code: string,
): string | undefined {
  if (code in endpoint.responses)
    return JSON.stringify(endpoint.responses[code], null, 2);
}
