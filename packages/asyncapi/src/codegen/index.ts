import * as Shared from 'shared-api/codegen';
import type { OperationObject } from '@/types';
import { javascript } from './javascript';
import { python } from './python';

export interface CodeUsageData {
  /** the protocol of the selected server, like `ws`, `mqtt` or `kafka` */
  protocol: string;
  /** the URL of the selected server, with its variables */
  server: string;
  /** the channel address with its parameters, like a topic or a WebSocket path */
  address: string;
  /** readers receive the messages, otherwise they send them */
  received: boolean;
  /** the selected message, with its example */
  message?: { name: string; contentType?: string; headers?: unknown; payload?: unknown };
  /** bindings of the server's protocol on the server, channel, operation and message */
  bindings: Partial<Record<'server' | 'channel' | 'operation' | 'message', object>>;
}

export interface CodeUsageContext {
  /** the URL to connect for URL protocols like `ws`, with API keys in the query as placeholders */
  url?: string;
}

export type CodeUsageGeneratorRegistry = Shared.CodeUsageGeneratorRegistry<
  CodeUsageData,
  CodeUsageContext
>;

export type CodeUsageGenerator = Shared.CodeUsageGenerator<CodeUsageData, CodeUsageContext>;

export function createCodeUsageGeneratorRegistry(
  inherit?: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  return Shared.createCodeUsageGeneratorRegistry(inherit);
}

export function registerDefaultCodeUsages(
  registry: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  registry.add('js', javascript);
  registry.add('python', python);
  return registry;
}

/** the generators of an operation, with its `x-codeSamples` */
export function withCodeSamples(
  registry: CodeUsageGeneratorRegistry,
  operation: OperationObject,
): CodeUsageGeneratorRegistry {
  const out = createCodeUsageGeneratorRegistry(registry);
  for (const item of operation['x-codeSamples'] ?? []) out.addInline(item);
  return out;
}
