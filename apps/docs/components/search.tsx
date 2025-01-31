'use client';

import { OramaClient } from '@oramacloud/client';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import SearchDialog from 'fumadocs-ui/components/dialog/search-orama';
import { useMode } from '@/app/layout.client';

const client = new OramaClient({
  endpoint: 'https://cloud.orama.run/v1/indexes/docs-fk97oe',
  api_key: 'oPZjdlFbq5BpR54bV5Vj57RYt83Xosk7',
});

export default function CustomSearchDialog(props: SharedProps) {
  return (
    <SearchDialog
      {...props}
      defaultTag={useMode() ?? 'ui'}
      allowClear
      tags={[
        {
          name: 'Framework',
          value: 'ui',
        },
        {
          name: 'Core',
          value: 'headless',
        },
        {
          name: 'MDX',
          value: 'mdx',
        },
      ]}
      client={client}
      showOrama
    />
  );
}
