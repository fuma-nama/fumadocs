import type { PlaygroundClientOptions } from '@/playground/client';

export interface APIPageClientOptions {
  playground?: PlaygroundClientOptions;
}

export function defineClientConfig(
  options: APIPageClientOptions,
): APIPageClientOptions {
  return options;
}
