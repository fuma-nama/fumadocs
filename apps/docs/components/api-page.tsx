import { openapi } from '@/lib/openapi';
import { shikiConfig } from '@/lib/shiki';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  shiki: shikiConfig,
});
