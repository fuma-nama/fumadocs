'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Checkbox as Primitive } from '@base-ui/react/checkbox';
import { cva } from 'class-variance-authority';
import { cnState } from '@/lib/cn';
import { CheckIcon } from 'lucide-react';

const checkboxRootStyles = cva(
  'grid size-4 shrink-0 place-items-center rounded border border-fe-border bg-fe-input text-fe-foreground outline-none hover:border-fe-ring focus-visible:border-fe-ring data-checked:bg-fe-primary data-checked:text-fe-primary-foreground disabled:cursor-not-allowed disabled:opacity-60',
);

const checkboxIndicatorStyles = cva('grid place-items-center');

export type CheckboxProps = ComponentPropsWithoutRef<typeof Primitive.Root>;

export function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <Primitive.Root className={cnState(checkboxRootStyles(), className)} {...props}>
      {children ?? (
        <Primitive.Indicator className={checkboxIndicatorStyles()}>
          <CheckIcon className="size-3.5" strokeWidth="4" />
        </Primitive.Indicator>
      )}
    </Primitive.Root>
  );
}
