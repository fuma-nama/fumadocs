import type { OperationMessage } from '@/operation';
import { cn } from '@/utils/cn';

/** the name of a message, a key or `name` is code unless the message has a title */
export function MessageName({ item, className }: { item: OperationMessage; className?: string }) {
  return <span className={cn(!item.message.title && 'font-mono', className)}>{item.name}</span>;
}
