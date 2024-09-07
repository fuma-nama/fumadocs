import { writeFileSync } from 'node:fs';

`
import { createMetadataFromSource } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const { withImage, generateParams, createAPI } =
  createMetadataFromSource({
    source,
  });
`;

export function add() {
  writeFileSync();
}
