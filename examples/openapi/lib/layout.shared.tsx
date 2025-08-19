import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/app/logo';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
  };
}
