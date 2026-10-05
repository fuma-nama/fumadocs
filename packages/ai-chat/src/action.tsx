'use client';
import { Tooltip } from '@base-ui/react/tooltip';
import { useTranslations } from '@fuma-translate/react';
import { cn } from 'cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { IconSwap } from './utils/motion';

/** an icon button, labelled by a tooltip */
export function ChatAction({
  label,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'aria-label'> & { label: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={label}
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'size-7 p-0 text-fd-muted-foreground [&_svg]:size-4',
          className,
        )}
        {...props}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={6} className="z-50">
          <Tooltip.Popup className="origin-(--transform-origin) rounded-md border bg-fd-popover px-2 py-1 text-xs text-fd-popover-foreground shadow-md transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Actions of an answer, shown on hover unless pinned.
 */
export function ChatActions({
  pinned = false,
  className,
  ...props
}: ComponentProps<'div'> & { pinned?: boolean }) {
  return (
    <div
      className={cn(
        '-ms-1.25 -mt-1 flex items-center motion-safe:animate-fd-fade-in [&>button]:size-6 [&_button_svg]:size-3.5',
        !pinned &&
          'opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

export function ChatCopyAction({ text }: { text: string }) {
  const t = useTranslations({ note: 'AI chat' });
  const [checked, onClick] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <ChatAction label={checked ? t('Copied') : t('Copy')} onClick={onClick}>
      <IconSwap swapped={checked} from={<CopyIcon />} to={<CheckIcon />} />
    </ChatAction>
  );
}
