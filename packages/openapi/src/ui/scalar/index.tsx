'use client';
import { cn } from 'fumadocs-ui/components/api';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useApiClientModal } from '@scalar/api-client-react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'rounded-full border inline-flex flex-row items-center py-1.5 px-2 text-xs font-medium',
  {
    variants: {
      color: {
        green: 'bg-green-400/20 text-green-600 dark:text-green-400',
        yellow: 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
        red: 'bg-red-400/20 text-red-600 dark:text-red-400',
        blue: 'bg-blue-400/20 text-blue-600 dark:text-blue-400',
        orange: 'bg-orange-400/20 text-orange-600 dark:text-orange-400',
      },
    },
  },
);

function getBadgeColor(
  method: string,
): VariantProps<typeof badgeVariants>['color'] {
  switch (method) {
    case 'PUT':
      return 'yellow';
    case 'PATCH':
      return 'orange';
    case 'POST':
      return 'blue';
    case 'DELETE':
      return 'red';
    default:
      return 'green';
  }
}

export default function ScalarPlayground({
  path,
  method,
}: {
  path: string;
  method: string;
}) {
  const client = useApiClientModal();

  return (
    <div className="flex flex-row gap-2 p-3 rounded-xl border bg-fd-card text-fd-card-foreground">
      <span
        className={cn(
          badgeVariants({
            color: getBadgeColor(method),
          }),
        )}
      >
        {method.toUpperCase()}
      </span>
      <code className="inline-flex flex-row items-center rounded-full flex-1 overflow-auto text-nowrap border px-2 text-xs text-fd-secondary-foreground bg-fd-secondary">
        {path}
      </code>
      <button
        type="submit"
        className={cn(
          buttonVariants({ color: 'primary' }),
          'px-3 py-1.5 rounded-full',
        )}
        onClick={() => client?.open({ path, method })}
      >
        Test
      </button>
    </div>
  );
}
