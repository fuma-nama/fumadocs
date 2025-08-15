import { build, writeShadcnRegistry } from '@fumadocs/cli/build';
import { registry } from '@/components/registry.mjs';
import * as ui from '../../../packages/ui/src/_registry';

export async function buildRegistry() {
  await writeShadcnRegistry(await build(registry), {
    dir: 'public/r',
    baseUrl: 'http://localhost:3000',
  });

  await writeShadcnRegistry(await build(ui.registry), {
    dir: 'public/r',
    baseUrl: 'http://localhost:3000',
  });
}
