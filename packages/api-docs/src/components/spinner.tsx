import { useTranslations } from '@/i18n/client';
import { cn } from '@/utils/cn';
import { Loader2Icon } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const t = useTranslations();

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
