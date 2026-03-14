import { openapi } from '@/lib/openapi';
import { defaultShikiOptions } from '@/lib/shiki';
import { createAPIPage } from 'fumadocs-openapi/ui';

export const APIPage = createAPIPage(openapi, {
  shikiOptions: defaultShikiOptions,
});
