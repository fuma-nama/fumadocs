'use client';
import { useRouter } from 'fumadocs-core/framework';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { decodeDevEvent, type DevServerEvent, getDevServerUrlFromEnv } from './shared';

export function DevClient(): ReactNode {
  const router = useRouter();

  const onUpdate = useEffectEvent((event: DevServerEvent) => {
    if (event.type === 'change') {
      console.log(`[@fumadocs/local-content] "${event.absolutePath}" updated`);
      router.refresh();
    }
  });

  useEffect(() => {
    const url = getDevServerUrlFromEnv();
    if (!url) return;

    const ws = new WebSocket(url);
    ws.onopen = () => {
      console.log(`[@fumadocs/local-content] connected to dev server at ${url}`);
    };

    ws.onmessage = (event) => {
      const decoded = decodeDevEvent(String(event.data));
      if (decoded) onUpdate(decoded);
    };

    ws.onclose = () => {
      console.log(`[@fumadocs/local-content] disconnected from dev server at ${url}`);
    };

    return () => {
      ws.close();
    };
  }, []);

  return null;
}
