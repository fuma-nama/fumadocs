import { type WebSocket } from 'ws';
import dynamic from 'next/dynamic';
import { createElement } from 'react';

const Client = dynamic(() => import('./hot-reload.client'), {
  ssr: false,
});

interface HotReloadOptions {
  /**
   * @defaultValue 3001
   */
  port?: number;

  /**
   * API endpoint for revoking cache
   *
   * @defaultValue '/api/revoke'
   */
  revokeUrl?: string;
}

export interface HotReloadInfo {
  ws?: WebSocket;
  component: React.ReactElement | null;
}

export function initHotReload({
  port = 3001,
  revokeUrl = '/api/revoke',
}: HotReloadOptions = {}): HotReloadInfo {
  if (process.env.NODE_ENV !== 'development') return { component: null };

  return {
    component: createElement(Client, {
      url: `ws://localhost:${port.toString()}`,
      revokeUrl,
    }),
  };
}
