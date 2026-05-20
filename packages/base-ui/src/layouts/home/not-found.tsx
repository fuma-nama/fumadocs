import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import Link from 'fumadocs-core/link';
import { HomeIcon } from 'lucide-react';
import { I18nLabel } from '@/contexts/i18n';

/**
 * the default not found page content, please make your own if you want to customize it.
 */
export function DefaultNotFound() {
  return (
    <div className="flex flex-col px-8 justify-center flex-1 text-center items-center gap-4">
      <h1 className="text-6xl font-bold text-fd-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold">
        <I18nLabel label="notFoundTitle" />
      </h2>
      <p className="text-fd-muted-foreground max-w-md">
        <I18nLabel label="notFoundDescription" />
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
        <I18nLabel label="notFoundLink" />
      </Link>
    </div>
  );
}
