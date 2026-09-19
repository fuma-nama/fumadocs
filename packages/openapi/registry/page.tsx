'use client';
import { Schema } from 'shared-api/components/schema';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createOpenAPIPage } from '@/utils/create-page';
import type { RenderContext } from '@/types';
import { Operation } from '@/ui/operation';

const shiki = defaultShikiFactory;
const shikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
} as const;

/** the options your UI renders with, passed to every operation */
const ctx: RenderContext = { shiki, shikiOptions };

export const OpenAPIPage = createOpenAPIPage({
  shiki,
  shikiOptions,
  components: {
    SchemaUI: Schema,
    Operation(props) {
      return <Operation {...props} ctx={ctx} />;
    },
    Layout({ operations, webhooks }) {
      return (
        <div className="flex flex-col gap-24 text-sm @container">
          {operations?.map((item) => item.children)}
          {webhooks?.map((item) => item.children)}
        </div>
      );
    },
  },
});
