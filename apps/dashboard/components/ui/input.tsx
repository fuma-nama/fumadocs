import type { ComponentPropsWithoutRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const inputBase = cva(
  'rounded-md border border-fe-border bg-fe-input px-3 py-2 text-sm text-fe-foreground outline-none placeholder:text-fe-muted-foreground focus:border-fe-ring',
);

export function Input({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input className={cn(inputBase(), className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea className={cn(inputBase(), className)} {...props} />;
}
