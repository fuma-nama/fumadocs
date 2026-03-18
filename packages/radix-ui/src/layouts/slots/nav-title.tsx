import Link from 'fumadocs-core/link';
import type { ComponentProps } from 'react';

export function NavTitle({ href, ...props }: ComponentProps<'a'>) {
  return <Link href={href ?? ''} {...props} />;
}
