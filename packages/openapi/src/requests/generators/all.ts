import type { CodeUsageGeneratorRegistry } from '.';
import { csharp } from './csharp';
import { curl } from './curl';
import { go } from './go';
import { java } from './java';
import { javascript } from './javascript';
import { python } from './python';

export function registerDefault(registry: CodeUsageGeneratorRegistry) {
  registry.add('curl', curl);
  registry.add('js', javascript);
  registry.add('go', go);
  registry.add('python', python);
  registry.add('java', java);
  registry.add('csharp', csharp);
}
