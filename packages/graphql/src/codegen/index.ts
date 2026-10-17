import * as Shared from 'shared-api/codegen';
import { csharp } from './csharp';
import { curl } from './curl';
import { go } from './go';
import { java } from './java';
import { javascript } from './javascript';
import { python } from './python';
import { rust } from './rust';

/** a GraphQL request sent over HTTP POST */
export interface CodeUsageData {
  /** the GraphQL endpoint */
  url: string;
  /** the GraphQL document */
  query: string;
  variables?: Record<string, unknown>;
  /** headers besides `Content-Type`, like `Authorization` */
  headers: Record<string, string>;
}

export type CodeUsageGeneratorRegistry = Shared.CodeUsageGeneratorRegistry<CodeUsageData>;

export type CodeUsageGenerator = Shared.CodeUsageGenerator<CodeUsageData>;

export function createCodeUsageGeneratorRegistry(
  inherit?: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  return Shared.createCodeUsageGeneratorRegistry(inherit);
}

export function registerDefaultCodeUsages(
  registry: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  registry.add('curl', curl);
  registry.add('js', javascript);
  registry.add('go', go);
  registry.add('python', python);
  registry.add('java', java);
  registry.add('csharp', csharp);
  registry.add('rust', rust);
  return registry;
}
