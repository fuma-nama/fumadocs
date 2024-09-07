import { createMetadataFromSource } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const { createAPI, withImage, generateParams } =
  createMetadataFromSource({
    source,
  });
