import { combineRegistry, RegistryCompiler, writeFumadocsRegistry } from '@fumadocs/cli/build';
import { registry } from '@/components/registry/index.js';
import * as radixUi from '../../../packages/radix-ui/registry';
import * as baseUi from '../../../packages/base-ui/registry';

export async function buildRegistry() {
  const results = await Promise.all([
    new RegistryCompiler(registry).compile(),
    new RegistryCompiler(radixUi.registry).compile(),
    new RegistryCompiler(baseUi.registry).compile(),
  ]);
  const all = combineRegistry(...results);

  await writeFumadocsRegistry(all, {
    dir: 'public/registry',
  });
}
