import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (delayMs === 0) return;
    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [delayMs, value]);

  if (delayMs === 0) return value;
  return debouncedValue;
}
