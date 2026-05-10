import { PageProps } from 'waku/router';
import { Counter } from '../../components/counter';

export default async function Page({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const out = import.meta.glob(['./**/*.tsx'], {
    base: '/content',
    eager: true,
  });

  return (
    <>
      {JSON.stringify(out, null, 2)}
      <p>{JSON.stringify(slugs)}</p>
      <Counter />
    </>
  );
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: [[]],
  } as const;
}
