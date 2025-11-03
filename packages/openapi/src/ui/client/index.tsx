'use client';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { OperationClientOptions } from '../operation/client';

export interface APIPageClientOptions {
  playground?: PlaygroundClientOptions;
  operation?: OperationClientOptions;
}

export function defineClientConfig(
  options: APIPageClientOptions,
): APIPageClientOptions {
  return options;
}
