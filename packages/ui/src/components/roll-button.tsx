'use client';

import { ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { useTreeContext } from '@/contexts/tree';

interface RollButtonProps {
  /**
   * Percentage of scroll position to display the roll button
   *
   * @defaultValue 0.1
   */
  percentage?: number;
}

/**
 * A button that scrolls to the top
 */
export function RollButton({
  percentage = 0.1,
}: RollButtonProps): React.ReactElement {
  const [show, setShow] = useState(false);
  const { navigation } = useTreeContext();
  const pathname = usePathname();
  const current = useMemo(
    () => navigation.find((item) => item.url === pathname),
    [pathname, navigation],
  );

  useEffect(() => {
    const listener = (): void => {
      const element = document.scrollingElement;
      if (!element) return;
      const nearTop =
        element.scrollTop / (element.scrollHeight - element.clientHeight) <
        percentage;

      setShow(!nearTop);
    };

    listener();
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
        buttonVariants({
          color: 'secondary',
          className:
            'fixed top-16 [&_svg]:size-4 gap-1 left-1/2 translate-x-[-50%] z-10 shadow-md rounded-full transition-all md:top-4',
        }),
        !show && 'translate-y-20 opacity-0',
      )}
      onClick={useCallback(() => {
        document.scrollingElement?.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, [])}
    >
      {current?.icon ?? <ChevronUp />}
      {current?.name}
    </button>
  );
}
