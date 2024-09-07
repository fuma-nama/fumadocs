import { createMetadataFromSource } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const { withImage, generateParams, createAPI } =
  createMetadataFromSource({
    source,
  });
