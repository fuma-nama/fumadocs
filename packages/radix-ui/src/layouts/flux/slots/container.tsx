'use client';

import { cn } from '@/utils/cn';
import type { ComponentProps } from 'react';

export function Container(props: ComponentProps<'div'>) {
  return (
    <div
      id="nd-flux-layout"
      {...props}
      className={cn('flex flex-col items-center pb-24 overflow-x-clip', props.className)}
    />
  );
}
