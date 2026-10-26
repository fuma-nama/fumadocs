import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { GraphQLScreen } from './graphql';

export default function Page() {
  const page = source.getPage(['graphql', 'queries', 'customer']);
  if (page?.type !== 'graphql') notFound();
  return (
    <GraphQLScreen title={page.data.title} docs={page.url} {...page.data.getGraphQLPageProps()} />
  );
}
