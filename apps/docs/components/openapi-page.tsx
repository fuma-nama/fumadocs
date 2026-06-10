'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: defaultShikiOptions,
});
