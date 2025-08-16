import {
  componentSchema,
  indexSchema,
  type OutputComponent,
  type OutputIndex,
} from '@/registry/schema';
import { z } from 'zod';

export function validateRegistryIndex(indexes: unknown): OutputIndex[] {
  return z.array(indexSchema).parse(indexes);
}

export function validateRegistryComponent(component: unknown): OutputComponent {
  return componentSchema.parse(component);
}
