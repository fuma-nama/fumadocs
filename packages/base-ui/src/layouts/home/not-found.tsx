'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import Link from 'fumadocs-core/link';
import { HomeIcon } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';

/**
 * the default not found page content, please make your own if you want to customize it.
 */
export function DefaultNotFound() {
  const t = useTranslations({ note: '404 not found page' });

  return (
    <div className="flex flex-col px-8 justify-center flex-1 text-center items-center gap-4">
      <h1 className="text-6xl font-bold text-fd-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold">{t('Page Not Found')}</h2>
      <p className="text-fd-muted-foreground max-w-md">
        {t(
          'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
        )}
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({
            className: 'mt-4 gap-1.5',
            variant: 'primary',
          }),
        )}
      >
        <HomeIcon className="size-4" />
        {t('Back to Home')}
      </Link>
    </div>
  );
}
