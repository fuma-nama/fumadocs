'use client';

import { ChevronUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface RollButtonProps {
  /**
   * Percentage of scroll position to display the roll button
   *
   * @defaultValue 0.2
   */
  percentage?: number;
}

/**
 * A button that scrolls to the top
 */
export function RollButton({ percentage = 0.2 }: RollButtonProps): JSX.Element {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const listener = (): void => {
      const element = document.scrollingElement;
      if (!element) return;
      const nearTop =
        element.scrollTop / (element.scrollHeight - element.clientHeight) <
        percentage;

      setShow(!nearTop);
    };

    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [percentage]);

  return (
    <button
      type="button"
      aria-label="Scroll to Top"
      className={cn(
        !show && 'translate-y-20 opacity-0',
        'fixed bottom-12 right-12 z-50 rounded-full border bg-background p-4 text-foreground transition-all',
      )}
      onClick={() => {
        document.scrollingElement?.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }}
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  );
}
