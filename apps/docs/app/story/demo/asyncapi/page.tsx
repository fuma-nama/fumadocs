import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { Screen } from '../screen';
import { AsyncAPIPage } from './asyncapi';

export default function Page() {
  const page = source.getPage(['asyncapi', 'planets', 'subscribeToPlanetEvents']);
  if (page?.type !== 'asyncapi') notFound();
  return (
    <Screen title={page.data.title} docs={page.url}>
      <AsyncAPIPage {...page.data.getAsyncAPIPageProps()} />
    </Screen>
  );
}
