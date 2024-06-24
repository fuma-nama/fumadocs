'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WebSocketServerMessage } from '@/github/dev';

interface ClientOptions {
  /**
   * The URL of WebSocket server
   */
  url: string | URL;

  /**
   * API endpoint for revoking cache
   */
  revokeUrl: string;
}

/**
 * A client component that enables hot-load in development mode
 */
export default function HotReload(props: ClientOptions): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    const ws = new WebSocket(props.url);

    ws.addEventListener('message', (message: MessageEvent<string>) => {
      const data = JSON.parse(message.data) as WebSocketServerMessage;
      if (!['add', 'update', 'delete'].includes(data.type)) return;

      console.log('new message from server', data);
      router.refresh();
    });

    return () => {
      ws.close();
    };
  }, []);

  return <></>;
}
