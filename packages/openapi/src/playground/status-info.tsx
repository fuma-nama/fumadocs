import { CircleCheck, CircleX } from 'lucide-react';
import type { Translations } from '@/i18n';

interface StatusInfo {
  description: string;
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

export function getStatusInfo(status: number, t: Translations): StatusInfo {
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
    description: t.statusNoDescription,
    color: 'text-fd-muted-foreground',
    icon: CircleX,
  };
}
