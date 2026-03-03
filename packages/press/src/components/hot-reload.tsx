'use client';
import { decodeEvent } from '@/lib/waku/hot-reload';
import { useEffect } from 'react';
import { useRouter } from 'waku';

export function HotReload() {
  const router = useRouter();
  useEffect(() => {
    const url = new URL('/_ws', window.location.href);
    url.protocol = url.protocol === 'https' ? 'wss' : 'ws';
    const socket = new WebSocket(url);

    socket.addEventListener('message', (event) => {
      const decoded = decodeEvent(event.data);
      if (!decoded) return;

      console.log('Received:', decoded);
      if (decoded.type === 'revalidate') {
        void router.reload();
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  return <></>;
}
