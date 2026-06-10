'use client';
import type { AnypointmqChannelBinding, AnypointmqMessageBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  joinBindingSummary,
} from '../shared';

export const anypointmqBinding = createBinding({
  label: 'Anypoint MQ',
  Channel: ({ binding }: { binding: NoReference<AnypointmqChannelBinding> }) => (
    <DestinationChannelBinding binding={binding} />
  ),
  Message: ({ binding }: { binding: NoReference<AnypointmqMessageBinding> }) => (
    <HeadersMessageBinding binding={binding} />
  ),
  getChannelSummary: (binding: NoReference<AnypointmqChannelBinding>) =>
    joinBindingSummary(binding.destination, binding.destinationType),
});
