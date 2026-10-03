import { useTranslations } from '@fuma-translate/react';
import { useMemo } from 'react';

interface StatusInfo {
  description: string;
  /** background class of its indicator */
  color: string;
}

export function useStatusInfo(status: number): StatusInfo {
  const t = useTranslations({ note: 'playground status info' });

  return useMemo(() => {
    let color: string;
    if (status >= 200 && status < 300) color = 'bg-green-500';
    else if (status >= 300 && status < 400) color = 'bg-blue-500';
    else if (status >= 400 && status < 500) color = 'bg-amber-500';
    else color = 'bg-red-500';

    switch (status) {
      case 200:
        return { color, description: t('OK') };
      case 201:
        return { color, description: t('Created') };
      case 202:
        return { color, description: t('Accepted') };
      case 204:
        return { color, description: t('No Content') };
      case 301:
        return { color, description: t('Moved Permanently') };
      case 302:
        return { color, description: t('Found') };
      case 304:
        return { color, description: t('Not Modified') };
      case 400:
        return { color, description: t('Bad Request') };
      case 401:
        return { color, description: t('Unauthorized') };
      case 403:
        return { color, description: t('Forbidden') };
      case 404:
        return { color, description: t('Not Found') };
      case 405:
        return { color, description: t('Method Not Allowed') };
      case 409:
        return { color, description: t('Conflict') };
      case 422:
        return { color, description: t('Unprocessable Content') };
      case 429:
        return { color, description: t('Too Many Requests') };
      case 500:
        return { color, description: t('Internal Server Error') };
      case 502:
        return { color, description: t('Bad Gateway') };
      case 503:
        return { color, description: t('Service Unavailable') };
    }

    if (status >= 200 && status < 300) return { color, description: t('Successful') };
    if (status >= 300 && status < 400) return { color, description: t('Redirect') };
    return { color, description: t('Error') };
  }, [t, status]);
}
