import { useRef, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timer = useRef<{ value: T; handler: number } | undefined>(undefined);

  if (delayMs === 0) return value;

  if (value !== debouncedValue && timer.current?.value !== value) {
    if (timer.current) clearTimeout(timer.current.handler);

    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    timer.current = { value, handler };
  }

  return debouncedValue;
}
