import {
  combineRegistry,
  RegistryCompiler,
  writeFumadocsRegistry,
  writeShadcnRegistry,
} from '@fumadocs/cli/build';
import { registry } from '@/components/registry.js';
import * as ui from '../../../packages/ui/src/_registry';

export async function buildRegistry() {
  const [mainRegistry, uiRegistry] = await Promise.all([
    new RegistryCompiler(registry).compile(),
    new RegistryCompiler(ui.registry).compile(),
  ]);
  const all = combineRegistry(mainRegistry, uiRegistry);

  await Promise.all([
    writeFumadocsRegistry(all, {
      dir: 'public/registry',
    }),
    writeShadcnRegistry(all, {
      dir: 'public/r',
      baseUrl: 'https://fumadocs.dev',
    }),
  ]);
}
