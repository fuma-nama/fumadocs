import type { Route } from './+types/not-found';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Not Found' }];
}

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
