import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { OpenAPIScreen } from './openapi';

export default function Page() {
  const page = source.getPage(['openapi', 'planets', 'getPlanet']);
  if (page?.type !== 'openapi') notFound();
  return (
    <OpenAPIScreen title={page.data.title} docs={page.url} {...page.data.getOpenAPIPageProps()} />
  );
}
