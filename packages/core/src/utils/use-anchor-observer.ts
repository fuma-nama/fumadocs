import { useEffect, useState } from 'react';

/**
 * Find the active heading of page
 *
 * It selects the top heading by default, and the last item when reached the bottom of page.
 *
 * @param watch - An array of element ids to watch
 * @returns Active anchor
 */
export function useAnchorObserver(watch: string[]): string[] {
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

        if (visible.length > 0) setActiveAnchor(visible);
      },
      { rootMargin: `-20px 0% -40% 0%`, threshold: 1 },
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
  }, [watch]);

  return activeAnchor;
}
