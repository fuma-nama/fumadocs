"use client";

import { createContext, FC, ReactNode, use, useMemo } from "react";
import { Story } from "..";
import { WithControl, WithControlProps } from "./with-control";
import { deserialize } from "@/utils/serialization";

export interface StoryClientOptions<C extends FC<any>> {
  Component: C;
}

export interface StoryClient<C extends FC<any>> {
  WithControl: FC<undefined>;
  Provider: FC<{ payload: string; children: ReactNode }>;

  _private_: {
    component: C;
  };
}

export type ClientPayload = Omit<WithControlProps, "Component">;

export function createStoryClient<StoryType extends Story<FC<any>>>(
  options: StoryClientOptions<StoryType extends Story<infer C> ? C : never>,
): StoryClient<StoryType extends Story<infer C> ? C : never> {
  const Context = createContext<ClientPayload | null>(null);
  const { Component } = options;

  return {
    Provider({ payload, children }) {
      return (
        <Context value={useMemo(() => deserialize(payload) as ClientPayload, [payload])}>
          {children}
        </Context>
      );
    },
    WithControl() {
      const ctx = use(Context);
      if (!ctx) throw new Error("missing story client provider.");
      return <WithControl {...ctx} Component={Component} />;
    },
    _private_: {
      component: Component,
    },
  };
}
