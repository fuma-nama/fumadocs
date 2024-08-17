import { useEffect, useState } from 'react';

/**
 * Find the active heading of page
 *
 * It selects the top heading by default, and the last item when reached the bottom of page.
 *
 * @param watch - An array of element ids to watch
 * @param single - only one active item at most
 * @returns Active anchor
 */
export function useAnchorObserver(watch: string[], single: boolean): string[] {
  const [activeAnchor, setActiveAnchor] = useState<string[]>([]);

  useEffect(() => {
    let visible: string[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !visible.includes(entry.target.id)) {
            visible = [...visible, entry.target.id];
          } else if (
            !entry.isIntersecting &&
            visible.includes(entry.target.id)
          ) {
            visible = visible.filter((v) => v !== entry.target.id);
          }
        }

        if (visible.length > 0)
          setActiveAnchor(single ? visible.slice(0, 1) : visible);
      },
      {
        rootMargin: single ? '-80px 0% -70% 0%' : `-20px 0% -40% 0%`,
        threshold: 1,
      },
    );

    for (const heading of watch) {
      const element = document.getElementById(heading);

      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [single, watch]);

  return activeAnchor;
}
