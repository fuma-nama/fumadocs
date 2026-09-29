import { CircleCheck, CircleX } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { useMemo } from 'react';

interface StatusInfo {
  description?: string;
  color: string;
  icon: React.ElementType;
}

export function useStatusInfo(status: number): StatusInfo {
  const t = useTranslations({ note: 'playground status info' });

  return useMemo(() => {
    switch (status) {
      case 400:
        return {
          description: t('Bad Request'),
          color: 'text-red-500',
          icon: CircleX,
        };
      case 401:
        return {
          description: t('Unauthorized'),
          color: 'text-red-500',
          icon: CircleX,
        };
      case 403:
        return {
          description: t('Forbidden'),
          color: 'text-red-500',
          icon: CircleX,
        };
      case 404:
        return {
          description: t('Not Found'),
          color: 'text-fd-muted-foreground',
          icon: CircleX,
        };
      case 500:
        return {
          description: t('Internal Server Error'),
          color: 'text-red-500',
          icon: CircleX,
        };
    }

    if (status >= 200 && status < 300) {
      return {
        description: t('Successful'),
        color: 'text-green-500',
        icon: CircleCheck,
      };
    }

    if (status >= 400) {
      return {
        description: t('Error'),
        color: 'text-red-500',
        icon: CircleX,
      };
    }

    return {
      color: 'text-fd-muted-foreground',
      icon: CircleX,
    };
  }, [t, status]);
}
