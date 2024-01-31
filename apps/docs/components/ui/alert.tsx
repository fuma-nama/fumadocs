import { AlertCircleIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Alert({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-row items-center gap-2 rounded-full border p-2 text-sm font-medium',
        className,
      )}
      {...props}
    >
      <AlertCircleIcon className="size-4" />
      <p className="text-muted-foreground">We are renaming to Fumadocs</p>
    </div>
  );
}
