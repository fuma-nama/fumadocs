'use client';

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import dynamic from 'next/dynamic';

export * from './components';

export const APIPlayground = dynamic(() =>
  import('./playground').then((mod) => mod.APIPlayground),
);

export const Responses = Tabs;
export const Response = Tab;

export const Requests = Tabs;
export const Request = Tab;
