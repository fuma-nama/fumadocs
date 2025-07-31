import { PageProps } from 'waku/router';
import DocPage from './[slug]';

export default async function DocHomePage(props: PageProps<'/docs'>) {
  return <DocPage {...props} slug="index" path="/docs/index" />;
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
