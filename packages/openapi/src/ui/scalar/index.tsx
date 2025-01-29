'use client';
import { cn } from 'fumadocs-ui/components/api';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  ApiClientModalProvider,
  useApiClientModal,
} from '@scalar/api-client-react';
import { MethodLabel } from '@/ui/components/method-label';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ScalarPlayground({
  path,
  method,
  spec,
}: {
  spec: object;
  path: string;
  method: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose',
        mounted ? `${resolvedTheme}-mode` : null,
      )}
    >
      <MethodLabel className="text-xs">{method}</MethodLabel>
      <code className="flex-1 overflow-auto text-nowrap text-[13px] text-fd-muted-foreground">
        {path}
      </code>
      <ApiClientModalProvider
        configuration={{
          themeId: 'moon',
          spec: {
            content: spec,
          },
        }}
      >
        <Trigger path={path} method={method} />
      </ApiClientModalProvider>
    </div>
  );
}

function Trigger({ path, method }: { path: string; method: string }) {
  const client = useApiClientModal();

  return (
    <button
      type="submit"
      className={cn(
        buttonVariants({ color: 'primary', size: 'sm' }),
        'px-3 py-1.5',
      )}
      onClick={() => client?.open({ path, method })}
    >
      Test
    </button>
  );
}
