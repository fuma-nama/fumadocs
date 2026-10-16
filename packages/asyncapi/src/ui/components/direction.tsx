'use client';
import type { ComponentProps } from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { Badge } from 'shared-api/components/badge';
import { cn } from '@/utils/cn';

type DirectionProps = Omit<ComponentProps<'span'>, 'children' | 'color'> & {
  action: 'send' | 'receive';
};

/** the label of which way messages go for readers, the opposite of the `action` of the documented application */
function useLabel(action: DirectionProps['action']) {
  const t = useTranslations({ note: 'message direction' });
  return action === 'send' ? t('Receive') : t('Send');
}

/**
 * Which way messages go for readers, like `RECEIVE`.
 */
export function DirectionBadge({ action, className, ...props }: DirectionProps) {
  return (
    <Badge
      color={action === 'send' ? 'green' : 'blue'}
      className={cn('shrink-0 text-xs uppercase', className)}
      {...props}
    >
      {useLabel(action)}
    </Badge>
  );
}

/**
 * Which way messages go for readers as an icon: an arrow into the phone when they receive the messages, out of it when they send them.
 *
 * Icons are sized by the font size, over the icon sizes of hosts like sidebar items.
 */
export function DirectionIcon({ action, className, ...props }: DirectionProps) {
  const label = useLabel(action);
  const incoming = action === 'send';
  const arrow = <ArrowRight className="size-[0.875em]! rtl:rotate-180" />;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center gap-px',
        incoming ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400',
        className,
      )}
      {...props}
    >
      {incoming && arrow}
      <Smartphone className="size-[1em]!" />
      {!incoming && arrow}
    </span>
  );
}
