import { createMetadataImage } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const { createAPI, withImage, generateParams } = createMetadataImage({
  source,
});
