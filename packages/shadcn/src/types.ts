import type { Registry, RegistryItem, registryItemFileSchema } from 'shadcn/schema';
import type z from 'zod-3';

export type BuiltRegistryFile = z.output<typeof registryItemFileSchema>;
export type BuiltRegistryItem = RegistryItem;
export type BuiltRegistry = Registry;

export interface RegistryContext {
  dir: string;
  registryJsonPath: string;
}
