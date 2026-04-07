import { CircleCheck, CircleX } from 'lucide-react';
import type { Translations } from '@/i18n';
import { useTranslations } from '@/ui/client/i18n';
import { useMemo } from 'react';

interface StatusInfo {
  description?: string;
  color: string;
  icon: React.ElementType;
}

const statusKeys: Record<
  number,
  { key: keyof Translations; color: string; icon: React.ElementType }
> = {
  400: { key: 'statusBadRequest', color: 'text-red-500', icon: CircleX },
  401: { key: 'statusUnauthorized', color: 'text-red-500', icon: CircleX },
  403: { key: 'statusForbidden', color: 'text-red-500', icon: CircleX },
  404: { key: 'statusNotFound', color: 'text-fd-muted-foreground', icon: CircleX },
  500: { key: 'statusInternalServerError', color: 'text-red-500', icon: CircleX },
};

export function useStatusInfo(status: number): StatusInfo {
  const t = useTranslations();

  return useMemo(() => {
    if (status in statusKeys) {
      const { key, color, icon } = statusKeys[status];
      return { description: t[key], color, icon };
    }

    if (status >= 200 && status < 300) {
      return {
        description: t.statusSuccessful,
        color: 'text-green-500',
        icon: CircleCheck,
      };
    }

    if (status >= 400) {
      return { description: t.statusError, color: 'text-red-500', icon: CircleX };
    }

    return {
      color: 'text-fd-muted-foreground',
      icon: CircleX,
    };
  }, [t, status]);
}
