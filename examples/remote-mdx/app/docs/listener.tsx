'use client';
import { createClient } from '@fumadocs/mdx-remote/github/dev/client';
import { useEffect } from 'react';

export function Listener() {
  useEffect(() => {
    createClient();
  }, []);

  return <></>;
}
