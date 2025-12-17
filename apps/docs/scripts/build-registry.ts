import {
  combineRegistry,
  RegistryCompiler,
  writeFumadocsRegistry,
  writeShadcnRegistry,
} from '@fumadocs/cli/build';
import { registry } from '@/components/registry.js';
import * as ui from '../../../packages/ui/src/_registry';
import * as radixUi from '../../../packages/radix-ui/src/_registry';
import * as baseUi from '../../../packages/base-ui/src/_registry';

export async function buildRegistry() {
  const results = await Promise.all([
    new RegistryCompiler(registry).compile(),
    new RegistryCompiler(ui.registry).compile(),
    new RegistryCompiler(radixUi.registry).compile(),
    new RegistryCompiler(baseUi.registry).compile(),
  ]);
  const all = combineRegistry(...results);

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
