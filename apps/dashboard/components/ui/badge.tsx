import type { ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
  {
    variants: {
      variant: {
        success: 'border-fe-success/60 bg-fe-success/10 text-fe-success',
        info: 'border-fe-info/60 bg-fe-info/10 text-fe-info',
        destructive: 'border-fe-destructive/60 bg-fe-destructive/10 text-fe-destructive',
        warning: 'border-fe-warning/60 bg-fe-warning/10 text-fe-warning',
        muted: 'border-fe-border bg-fe-muted text-fe-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'muted',
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export type CollabConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function badgeVariantForCollabConnection(status: CollabConnectionStatus): BadgeVariant {
  switch (status) {
    case 'connected':
      return 'success';
    case 'connecting':
      return 'info';
    case 'error':
      return 'destructive';
    case 'disconnected':
      return 'warning';
  }
}

interface BadgeProps extends ComponentPropsWithoutRef<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ variant = 'muted', className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
