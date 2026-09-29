'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { createAsyncAPIPage } from '@fumadocs/asyncapi/ui';

export const AsyncAPIPage = createAsyncAPIPage({
  shikiOptions: defaultShikiOptions,
});
