'use client';
import type { JmsChannelBinding, JmsMessageBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  joinBindingSummary,
} from '../shared';

export const jmsBinding = createBinding({
  label: 'JMS',
  Channel: ({ binding }: { binding: NoReference<JmsChannelBinding> }) => (
    <DestinationChannelBinding binding={binding} />
  ),
  Message: ({ binding }: { binding: NoReference<JmsMessageBinding> }) => (
    <HeadersMessageBinding binding={binding} />
  ),
  getChannelSummary: (binding: NoReference<JmsChannelBinding>) =>
    joinBindingSummary(binding.destination, binding.destinationType),
});
