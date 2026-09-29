'use client';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useApiClient } from '@scalar/api-client-react';
import { MethodLabel } from '@/ui/components/method-label';
import { useTheme } from 'fumadocs-ui/provider/base';
import { useSyncExternalStore } from 'react';
import type { HttpMethods } from '@/types';
import { useTranslations } from '@fuma-translate/react';
import { useOpenAPI } from '@/utils/create-page';
import '@scalar/api-client-react/style.css';

const noop = () => () => {};

export default function ScalarPlayground({ path, method }: { path: string; method: HttpMethods }) {
  const { resolvedTheme } = useTheme();
  const { bundled } = useOpenAPI().doc;
  const t = useTranslations({ note: 'scalar API client' });
  // `false` on the server and during hydration
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const client = useApiClient({
    configuration: {
      content: bundled as never,
    },
  });

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose',
        mounted ? `${resolvedTheme}-mode` : null,
      )}
    >
      <MethodLabel className="text-xs">{method}</MethodLabel>
      <code className="flex-1 overflow-auto text-nowrap text-[0.8125rem] text-fd-muted-foreground">
        {path}
      </code>
      <button
        type="submit"
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'px-3 py-1.5')}
        onClick={() => client?.open({ path, method: method as never })}
      >
        {t('Test')}
      </button>
    </div>
  );
}
