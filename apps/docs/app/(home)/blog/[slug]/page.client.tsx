'use client';
import { Share } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  TooltipContent,
  Tooltip,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { useState } from 'react';

export function Control({ url }: { url: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const onClick = (): void => {
    setOpen(true);
    void navigator.clipboard.writeText(`${window.location.origin}${url}`);
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        className={cn(
          buttonVariants({ className: 'gap-2', variant: 'secondary' }),
        )}
        onClick={onClick}
      >
        <Share className="size-4" />
        Share Post
      </TooltipTrigger>
      <TooltipContent className="bg-popover p-2 text-popover-foreground text-sm border rounded-lg">
        Copied
      </TooltipContent>
    </Tooltip>
  );
}
