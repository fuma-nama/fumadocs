import { useTranslations } from '@/ui/client/i18n';
import { cn } from '@/utils/cn';
import { Loader2Icon } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const t = useTranslations();

  return (
    <Loader2Icon
      role="status"
      aria-label={t.loading}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
