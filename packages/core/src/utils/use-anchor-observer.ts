import { useEffect, useState } from 'react';

/**
 * Find the active heading of page
 *
 * It selects the top heading by default, and the last item when reached the bottom of page.
 *
 * @param watch - An array of element ids to watch
 * @returns Active anchor
 */
export function useAnchorObserver(watch: string[]): string | undefined {
  const [activeAnchor, setActiveAnchor] = useState<string>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setActiveAnchor((f) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              return entry.target.id;
            }
          }

          // use the first item if not found
          return f ?? watch[0];
        });
      },
      { rootMargin: `-100px 0% -75% 0%`, threshold: 1 },
    );

    const scroll = (): void => {
      const element = document.scrollingElement;
      if (!element) return;

      // select the last item when reached the bottom
      if (
        element.scrollTop >=
        // assume you have a 10px margin
        element.scrollHeight - element.clientHeight - 10
      ) {
        setActiveAnchor(watch.at(-1));
      }
    };

    window.addEventListener('scroll', scroll);

    for (const heading of watch) {
      const element = document.getElementById(heading);

      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => {
      window.removeEventListener('scroll', scroll);
      observer.disconnect();
    };
  }, [watch]);

  return activeAnchor;
}
