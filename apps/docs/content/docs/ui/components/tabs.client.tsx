'use client';

import { useEffect, useState } from 'react';

export function UrlBar() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      setUrl(window.location.pathname + window.location.hash);
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return <pre className="rounded-lg border bg-card p-2 text-sm">{url}</pre>;
}
