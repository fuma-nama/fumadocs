import type { ParsedSchema } from '@/utils/schema';
import { sample } from 'openapi-sampler';

export function getDefaultValue(schema: ParsedSchema): unknown {
  return sample(schema as never, { skipNonRequired: true, skipReadOnly: true, quiet: true });
}
