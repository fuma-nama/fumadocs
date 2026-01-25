"use client";

import { createContext, FC, ReactNode, use, useMemo } from "react";
import { Story } from "..";
import { WithControl, WithControlProps } from "./with-control";
import { deserialize } from "@/utils/serialization";

export interface StoryClientOptions<C extends FC<any>> {
  Component: C;
}

export interface StoryClient<C extends FC<any> = FC<any>> {
  _private_: {
    component: C;
  };
}

const Context = createContext<{
  payloads: Map<string, ClientPayload>;
  clients: Map<string, StoryClient>;
} | null>(null);

export type ClientPayload = Omit<WithControlProps, "Component">;

export function createStoryClient<StoryType extends Story<FC<any>>>(
  options: StoryClientOptions<StoryType extends Story<infer C> ? C : never>,
): StoryClient<StoryType extends Story<infer C> ? C : never> {
  const { Component } = options;

  return {
    _private_: {
      component: Component,
    },
  };
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
  const payloadMap = useMemo(() => {
    const map = new Map<string, ClientPayload>();
    for (const [name, payload] of payloadEntries) {
      map.set(name, deserialize(payload) as ClientPayload);
    }
    return map;
  }, [payloadEntries]);
  const clientMap = useMemo(() => {
    const map = new Map<string, StoryClient>();
    for (const [name, client] of clientEntries) {
      map.set(name, client);
    }
    return map;
  }, [clientEntries]);

  return (
    <Context
      value={useMemo(
        () => ({
          clients: clientMap,
          payloads: payloadMap,
        }),
        [clientMap, payloadMap],
      )}
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
  const ctx = use(Context);
  if (!ctx) throw new Error("missing <StoryPayloadProvider />.");

  const client = ctx.clients.get(name);
  if (!client) throw new Error(`missing "${name}" client in <StoryPayloadProvider />.`);

  const payload = ctx.payloads.get(name);
  if (!payload) throw new Error(`missing "${name}" payload in <StoryPayloadProvider />.`);

  return <WithControl {...payload} Component={client._private_.component} />;
}
