import { useState } from 'react';

export function useOnChange<T>(
  value: T,
  onChange: (current: T, previous: T) => void,
): void {
  const [prev, setPrev] = useState<T>(value);

  if (prev !== value) {
    onChange(value, prev);
    setPrev(value);
  }
}
