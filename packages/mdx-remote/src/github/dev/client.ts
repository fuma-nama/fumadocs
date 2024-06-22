'use client';
import { type UpdateMessage } from '@/github/dev/watcher';

export function createClient(url: string | URL = 'ws://localhost:8081'): void {
  const ws = new WebSocket(url);

  ws.addEventListener('message', (message: MessageEvent<UpdateMessage>) => {
    console.log(message);
  });
}
