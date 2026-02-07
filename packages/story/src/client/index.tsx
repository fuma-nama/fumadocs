'use client';

import { createContext, FC, ReactNode, use, useMemo } from 'react';
import { Story } from '..';
import { WithControl, WithControlProps } from './with-control';
import { deserialize } from '@/utils/serialization';

export interface StoryClientOptions<C extends FC<any>> {
  Component: C;
}

export interface StoryClient<C extends FC<any> = FC<any>> {
  WithControl: FC;
  _private_: {
    component: C;
  };
}

const Context = createContext<{
  clientMap: Map<string, StoryClient>;
  clientPayloads: WeakMap<StoryClient, ClientPayload>;
} | null>(null);

export type ClientPayload = Omit<WithControlProps, 'Component'>;

export function createStoryClient<StoryType extends Story<FC<any>>>(
  options: StoryClientOptions<StoryType extends Story<infer C> ? C : never>,
) {
  const { Component } = options;

  const story: StoryClient<StoryType extends Story<infer C> ? C : never> = {
    WithControl() {
      const { clientPayloads } = usePayloadContext();
      const payload = clientPayloads.get(story);
      if (!payload) throw new Error('missing story payload in <StoryPayloadProvider />.');

      return <WithControl {...payload} Component={Component} />;
    },
    _private_: {
      component: Component,
    },
  };
  return story;
}

export function StoryPayloadProvider<Payloads extends Record<string, string>>({
  children,
  clients,
  payloads,
}: {
  payloads: Payloads;
  clients: { [K in keyof Payloads]: StoryClient<FC<any>> };
  children: ReactNode;
}) {
  const clientEntries = Object.entries(clients);
  const payloadEntries = Object.entries(payloads);

  return (
    <Context
      value={useMemo(() => {
        const clientPayloads = new WeakMap<StoryClient, ClientPayload>();
        const clientMap = new Map<string, StoryClient>();
        for (const [name, client] of clientEntries) {
          clientMap.set(name, client);
        }

        for (const [name, payload] of payloadEntries) {
          const client = clientMap.get(name);
          if (client) clientPayloads.set(client, deserialize(payload) as ClientPayload);
        }

        return {
          clientMap,
          clientPayloads,
        };
      }, [clientEntries, payloadEntries])}
    >
      {children}
    </Context>
  );
}

export function StoryWithControl({
  name,
}: {
  /**
   * the key of story payload in `<StoryPayloadProvider />`
   */
  name: string;
}) {
  const { clientMap } = usePayloadContext();
  const client = clientMap.get(name);
  if (!client) throw new Error(`missing "${name}" client in <StoryPayloadProvider />.`);

  return <client.WithControl />;
}

function usePayloadContext() {
  const ctx = use(Context);
  if (!ctx) throw new Error('missing <StoryPayloadProvider />.');
  return ctx;
}
