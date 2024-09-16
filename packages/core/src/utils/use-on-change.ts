import { useState } from 'react';

/**
 * @param value - state to watch
 * @param onChange - when the state changed
 * @param isUpdated - a function that determines if the state is updated
 */
export function useOnChange<T>(
  value: T,
  onChange: (current: T, previous: T) => void,
  isUpdated: (prev: T, current: T) => boolean = (prev, current) =>
    prev !== current,
): void {
  const [prev, setPrev] = useState<T>(value);

  if (isUpdated(prev, value)) {
    onChange(value, prev);
    setPrev(value);
  }
}
