'use client';
import { ChevronDown, ShareIcon } from 'lucide-react';
import { useState } from 'react';
import { TOCScrollArea, useTOCItems } from 'fumadocs-ui/components/toc';
import { TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/cn';

const buttonClass =
  'inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-all duration-150 hover:bg-fd-accent hover:text-fd-accent-foreground active:scale-95';

/** the table of contents and share button of a post, floating at the bottom */
export function BlogPanel() {
  const items = useTOCItems();
  const [open, setOpen] = useState(false);
  const [shared, onShare] = useCopyButton(() =>
    navigator.share
      ? navigator.share({ title: document.title, url: location.href })
      : navigator.clipboard.writeText(location.href),
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="fixed bottom-2 left-1/2 z-20 w-full max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-xl border bg-fd-secondary/80 p-1 text-sm shadow-md backdrop-blur-sm sm:bottom-4 sm:max-w-[400px]"
    >
      <CollapsibleContent>
        <TOCScrollArea className="max-h-[min(600px,calc(100vh-7.5rem))]">
          <TOCItems>
            {items.map((item) => (
              <TOCItem key={item.url} item={item} onClick={() => setOpen(false)} />
            ))}
          </TOCItems>
        </TOCScrollArea>
      </CollapsibleContent>
      <div className="flex flex-row gap-2">
        {items.length > 0 && (
          <CollapsibleTrigger className={cn(buttonClass, 'min-w-0')}>
            <span className="truncate">Table of Contents</span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 text-fd-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>
        )}
        <button
          type="button"
          className={cn(buttonClass, 'ms-auto text-fd-muted-foreground')}
          onClick={onShare}
        >
          <ShareIcon className="size-3.5 shrink-0" />
          {shared ? 'Copied' : 'Share'}
        </button>
      </div>
    </Collapsible>
  );
}
