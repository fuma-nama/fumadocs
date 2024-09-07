import { writeFileSync } from 'node:fs';

`
import { createMetadataImage } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const { withImage, generateParams, createAPI } =
  createMetadataImage({
    source,
  });
`;

export function add() {
  writeFileSync();
}
