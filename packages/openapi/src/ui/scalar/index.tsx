'use client';
import { cn } from 'fumadocs-ui/components/api';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useApiClientModal } from '@scalar/api-client-react';
import { MethodLabel } from '@/ui/components/method-label';

export default function ScalarPlayground({
  path,
  method,
}: {
  path: string;
  method: string;
}) {
  const client = useApiClientModal();

  return (
    <div className="flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
      <MethodLabel>{method}</MethodLabel>
      <code className="flex-1 overflow-auto text-nowrap text-[13px] text-fd-muted-foreground">
        {path}
      </code>
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
    </div>
  );
}
