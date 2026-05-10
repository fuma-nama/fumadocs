'use client';
import { cn } from '@/lib/cn';
import type { ComponentProps } from 'react';
import { useState } from 'react';

export function Image({ className, ...props }: ComponentProps<'img'>) {
  const [error, setError] = useState(false);

  function handleError() {
    if (!error) {
      setError(true);
    }
  }

  return <img className={cn('rounded-xl border', className)} onError={handleError} {...props} />;
}
