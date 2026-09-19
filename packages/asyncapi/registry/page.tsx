'use client';
import { Schema } from 'shared-api/components/schema';
import { createAsyncAPIRenderer } from '@/utils/create-page';
import { Operation } from '@/ui/operation';

export const AsyncAPIPage = createAsyncAPIRenderer({
  components: {
    SchemaUI: Schema,
    Operation,
    Layout({ operations }) {
      return (
        <div className="flex flex-col gap-24 text-sm @container">
          {operations?.map((item) => item.children)}
        </div>
      );
    },
  },
});
