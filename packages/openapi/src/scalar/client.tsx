'use client';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useApiClient } from '@scalar/api-client-react';
import { MethodLabel } from '@/ui/components/method-label';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { HttpMethods } from '@/types';
import '@scalar/api-client-react/style.css';

export default function ScalarPlayground({
  path,
  method,
  spec,
}: {
  spec: object;
  path: string;
  method: HttpMethods;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const client = useApiClient({
    configuration: {
      theme: 'moon',
      spec,
    },
  });

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
      <code className="flex-1 overflow-auto text-nowrap text-[0.8125rem] text-fd-muted-foreground">
        {path}
      </code>
      <button
        type="submit"
        className={cn(buttonVariants({ color: 'primary', size: 'sm' }), 'px-3 py-1.5')}
        onClick={() => client?.open({ path, method: method as never })}
      >
        Test
      </button>
    </div>
  );
}
