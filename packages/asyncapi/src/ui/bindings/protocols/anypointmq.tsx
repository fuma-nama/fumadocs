'use client';
import type { AnypointmqChannelBinding, AnypointmqMessageBinding } from '@/types/asyncapi-3';
import { createBinding, DestinationChannelBinding, HeadersMessageBinding } from '../shared';

export const anypointmqBinding = createBinding({
  label: 'Anypoint MQ',
  Channel: ({ binding }: { binding: AnypointmqChannelBinding }) => (
    <DestinationChannelBinding binding={binding} />
  ),
  Message: ({ binding }: { binding: AnypointmqMessageBinding }) => (
    <HeadersMessageBinding binding={binding} />
  ),
});
