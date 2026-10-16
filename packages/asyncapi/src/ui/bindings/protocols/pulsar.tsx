'use client';
import type { PulsarChannelBinding, PulsarServerBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, ValueRow } from '../shared';

function formatPersistence(value?: string) {
  if (value === 'persistent') return 'Persistent';
  if (value === 'non-persistent') return 'Non-persistent';
  return value;
}

function PulsarServerBinding({ binding }: { binding: PulsarServerBinding }) {
  return (
    <Fields>
      <CodeRow label="Tenant" value={binding.tenant} />
    </Fields>
  );
}

function PulsarChannelBinding({ binding }: { binding: PulsarChannelBinding }) {
  const { retention } = binding;

  return (
    <Fields>
      <CodeRow label="Namespace" value={binding.namespace} />
      <CodeRow label="Persistence" value={formatPersistence(binding.persistence)} />
      <ValueRow label="Compaction" value={binding.compaction} />
      <ValueRow label="Geo Replication" value={binding['geo-replication']} />
      {retention && (
        <GroupRow label="Retention" title="Retention">
          <ValueRow label="Time" value={retention.time} />
          <ValueRow label="Size" value={retention.size} />
        </GroupRow>
      )}
      <ValueRow label="TTL" value={binding.ttl} />
      <ValueRow label="Deduplication" value={binding.deduplication} />
    </Fields>
  );
}

export const pulsarBinding = createBinding({
  label: 'Apache Pulsar',
  Server: PulsarServerBinding,
  Channel: PulsarChannelBinding,
});
