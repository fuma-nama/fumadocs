import { build, writeShadcnRegistry } from '@fumadocs/cli/build';
import { registry } from '@/components/registry.mjs';
import * as ui from '../../../packages/ui/src/_registry';

export async function buildRegistry() {
  await writeShadcnRegistry('public/r', await build(registry));
  await writeShadcnRegistry('public/r', await build(ui.registry));
}
