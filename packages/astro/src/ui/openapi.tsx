import { createOpenAPIPage, type OpenAPIPageProps } from 'fumadocs-openapi/ui';
import { ContentProvider, type ProviderData } from './provider';

const OpenAPIPage = createOpenAPIPage();

export function APIPage({ page, provider }: { page: OpenAPIPageProps; provider: ProviderData }) {
  return (
    <ContentProvider provider={provider}>
      <OpenAPIPage {...page} />
    </ContentProvider>
  );
}
