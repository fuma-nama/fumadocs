import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { Screen } from '../screen';
import { OpenAPIPage } from './openapi';

export default function Page() {
  const page = source.getPage(['openapi', 'planets', 'getPlanet']);
  if (page?.type !== 'openapi') notFound();
  return (
    <Screen title={page.data.title} docs={page.url}>
      <OpenAPIPage {...page.data.getOpenAPIPageProps()} />
    </Screen>
  );
}
