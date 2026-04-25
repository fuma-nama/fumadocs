import { twMerge as cn } from 'tailwind-merge';

export { cn };

export function cnState<TState>(
  base: string,
  className: string | ((state: TState) => string | undefined) | undefined,
) {
  if (!className) return base;
  if (typeof className === 'function') {
    return (state: TState) => cn(base, className(state));
  }
  return cn(base, className);
}
