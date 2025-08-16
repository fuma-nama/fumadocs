import {
  build,
  combineRegistry,
  writeFumadocsRegistry,
  writeShadcnRegistry,
} from '@fumadocs/cli/build';
import { registry } from '@/components/registry.mjs';
import * as ui from '../../../packages/ui/src/_registry';

export async function buildRegistry() {
  const [mainRegistry, uiRegistry] = await Promise.all([
    build(registry),
    build(ui.registry),
  ]);
  const all = combineRegistry(mainRegistry, uiRegistry);

  await Promise.all([
    writeFumadocsRegistry(all, {
      dir: 'public/registry',
    }),
    writeShadcnRegistry(all, {
      dir: 'public/r',
      baseUrl: 'http://localhost:3000',
    }),
  ]);
}
