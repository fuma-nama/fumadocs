import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, disabled = false): boolean | null {
  const [isMatch, setMatch] = useState<boolean | null>(null);

  useEffect(() => {
    if (disabled) return;
    const mediaQueryList = window.matchMedia(query);

    const handleChange = () => {
      setMatch(mediaQueryList.matches);
    };
    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [disabled, query]);

  return isMatch;
}
