import { ChevronDown } from 'lucide-react';
import type {
  PopoverProps,
  PopoverTriggerProps,
} from '@radix-ui/react-popover';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';

export function TypeSelect({
  items,
  value,
  onValueChange,
  ...props
}: {
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
} & PopoverTriggerProps): React.ReactNode {
  return (
    <Popover>
      <PopoverTrigger
        {...props}
        className={cn(
          buttonVariants({
            color: 'secondary',
            size: 'sm',
            className: props.className,
          }),
        )}
      >
        <ChevronDown className="size-4" />
        {value}
      </PopoverTrigger>
      <PopoverContent className="flex min-w-0 flex-col">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'sm',
                className: item === value && 'bg-accent text-accent-foreground',
              }),
            )}
            onClick={() => {
              onValueChange(item);
            }}
          >
            {item}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
