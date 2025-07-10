import { source } from '@/source';
import { APIPageInner } from 'fumadocs-openapi/ui';
import { processDocument } from 'fumadocs-openapi/utils/process-document';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsPage } from 'fumadocs-ui/page';
import { Suspense } from 'react';

const document = {
  openapi: '3.0.0',
  info: {
    title: 'Simple API',
    version: '1.0.0',
    description: 'A simple OpenAPI document example.',
  },
  paths: {
    '/hello': {
      get: {
        summary: 'Say hello',
        responses: {
          '200': {
            description: 'A hello message',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const loader = async ({}) => {
  const processed = await processDocument(document as any, true);

  return { processed, tree: source.pageTree };
};

export const Page = ({ loaderData: { processed, tree } }) => {
  return (
    <DocsLayout
      nav={{
        title: 'React Router',
      }}
      tree={tree}
    >
      <DocsPage>
        <DocsBody>
          <h1>OpenAPI example</h1>
          <Suspense fallback={<div>Loading API documentation...</div>}>
            <APIPageInner
              operations={[
                {
                  method: 'get' as any,
                  path: '/hello',
                },
              ]}
              processed={processed}
              hasHead={false}
            />
          </Suspense>
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
};

export default Page;
