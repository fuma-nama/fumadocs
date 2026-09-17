'use client';
import { createPageComponents } from '@fumadocs/api-docs/components/defaults';
import { Schema } from '@fumadocs/api-docs/components/schema';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { createAsyncAPIPage } from '@/headless';
import type { RenderContext } from '@/types';
import { Operation } from '@/ui/operation';

const shiki = defaultShikiFactory;
const shikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
} as const;

const { components, renderMarkdown, renderCodeblock } = createPageComponents({
  shiki,
  shikiOptions,
});

const SchemaUI: RenderContext['SchemaUI'] = (props) => (
  <Schema {...props} renderMarkdown={renderMarkdown} renderCodeblock={renderCodeblock} />
);

/** the options your UI renders with, passed to every operation */
const ctx: RenderContext = { shiki, shikiOptions, SchemaUI };

export const AsyncAPIPage = createAsyncAPIPage({
  components: {
    ...components,
    SchemaUI,
    Operation(props) {
      return <Operation {...props} ctx={ctx} />;
    },
    Layout({ operations }) {
      return (
        <div className="flex flex-col gap-24 text-sm @container">
          {operations?.map((item) => item.children)}
        </div>
      );
    },
  },
});
