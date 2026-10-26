import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { AsyncAPIScreen } from './asyncapi';

export default function Page() {
  const page = source.getPage(['asyncapi', 'planets', 'subscribeToPlanetEvents']);
  if (page?.type !== 'asyncapi') notFound();
  return (
    <AsyncAPIScreen title={page.data.title} docs={page.url} {...page.data.getAsyncAPIPageProps()} />
  );
}
