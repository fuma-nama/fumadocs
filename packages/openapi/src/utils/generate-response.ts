import { type Endpoint } from '@/endpoint';
import { generateInput } from '@/utils/generate-input';

export function getExampleResponse(
  endpoint: Endpoint,
  code: string,
): string | undefined {
  if (code in endpoint.responses) {
    const value = generateInput(
      endpoint.method,
      endpoint.responses[code].schema,
    );

    return JSON.stringify(value, null, 2);
  }
}
