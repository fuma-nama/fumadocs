'use client';
import { Schema } from 'shared-api/components/schema';
import { createOpenAPIRenderer } from '@/utils/create-page';
import { Operation } from '@/ui/operation';

export const OpenAPIPage = createOpenAPIRenderer({
  components: {
    SchemaUI: Schema,
    Operation,
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
