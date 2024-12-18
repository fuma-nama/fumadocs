import { createMetadataImage } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const metadataImage = createMetadataImage({
  source,
  imageRoute: 'og',
});
