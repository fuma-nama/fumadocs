import { useTranslations } from '@fuma-translate/react';

interface StatusInfo {
  description: string;
  /** background class of its indicator */
  color: string;
}

export function useStatusInfo(status: number): StatusInfo {
  const t = useTranslations({ note: 'playground status info' });
  const descriptions: Partial<Record<number, string>> = {
    200: t('OK'),
    201: t('Created'),
    202: t('Accepted'),
    204: t('No Content'),
    301: t('Moved Permanently'),
    302: t('Found'),
    304: t('Not Modified'),
    400: t('Bad Request'),
    401: t('Unauthorized'),
    403: t('Forbidden'),
    404: t('Not Found'),
    405: t('Method Not Allowed'),
    409: t('Conflict'),
    422: t('Unprocessable Content'),
    429: t('Too Many Requests'),
    500: t('Internal Server Error'),
    502: t('Bad Gateway'),
    503: t('Service Unavailable'),
  };

  if (status >= 200 && status < 300)
    return { color: 'bg-green-500', description: descriptions[status] ?? t('Successful') };
  if (status >= 300 && status < 400)
    return { color: 'bg-blue-500', description: descriptions[status] ?? t('Redirect') };
  return {
    color: status >= 400 && status < 500 ? 'bg-amber-500' : 'bg-red-500',
    description: descriptions[status] ?? t('Error'),
  };
}
