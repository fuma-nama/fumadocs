import type { ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva('rounded-lg border border-fe-border', {
  variants: {
    tone: {
      default: 'bg-fe-card text-fe-card-foreground',
      muted: 'bg-fe-muted text-fe-muted-foreground',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

interface CardProps extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof cardVariants> {}

export function Card({ tone = 'default', className, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone }), className)} {...props} />;
}
