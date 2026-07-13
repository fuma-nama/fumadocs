'use client';
import type { AnypointmqChannelBinding, AnypointmqMessageBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  joinBindingSummary,
} from '../shared';

export const anypointmqBinding = createBinding({
  label: 'Anypoint MQ',
  Channel: ({ binding }: { binding: AnypointmqChannelBinding }) => (
    <DestinationChannelBinding binding={binding} />
  ),
  Message: ({ binding }: { binding: AnypointmqMessageBinding }) => (
    <HeadersMessageBinding binding={binding} />
  ),
  getChannelSummary: (binding: AnypointmqChannelBinding) =>
    joinBindingSummary(binding.destination, binding.destinationType),
});
