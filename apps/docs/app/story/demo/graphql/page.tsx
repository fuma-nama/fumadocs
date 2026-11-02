import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { Screen } from '../screen';
import { GraphQLPage } from './graphql';

export default function Page() {
  const page = source.getPage(['graphql', 'queries', 'customer']);
  if (page?.type !== 'graphql') notFound();
  return (
    <Screen title={page.data.title} docs={page.url}>
      <GraphQLPage {...page.data.getGraphQLPageProps()} />
    </Screen>
  );
}
