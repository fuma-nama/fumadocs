import { createMetadataImage } from 'fumadocs-core/server';
import { source } from '@/lib/source';

export const metadataImage = createMetadataImage({
  imageRoute: 'docs-og',
  source,
});
