'use client';
import { ShareIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';

export function Control({ url }: { url: string }): React.ReactElement {
  const onClick = (): void => {
    void navigator.clipboard.writeText(`${window.location.origin}${url}`);
  };

  return (
    <button
      className={cn(
        buttonVariants({ className: 'gap-2', variant: 'secondary' }),
      )}
      onClick={onClick}
    >
      <ShareIcon className="size-4" />
      Share Post
    </button>
  );
}
