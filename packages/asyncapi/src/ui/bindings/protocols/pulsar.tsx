'use client';
import type { PulsarChannelBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  joinBindingSummary,
} from '../shared';

function formatPersistence(value: string): string {
  if (value === 'persistent') return 'Persistent';
  if (value === 'non-persistent') return 'Non-persistent';
  return value;
}

function getPulsarChannelSummary(binding: NoReference<PulsarChannelBinding>): string | undefined {
  return joinBindingSummary(
    binding.namespace,
    binding.persistence ? formatPersistence(binding.persistence) : undefined,
  );
}

function PulsarChannelBinding({ binding }: { binding: NoReference<PulsarChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.namespace && (
        <BindingFieldRow
          label="Namespace"
          value={<code className="text-xs">{binding.namespace}</code>}
        />
      )}
      {binding.persistence && (
        <BindingFieldRow
          label="Persistence"
          value={<code className="text-xs">{formatPersistence(binding.persistence)}</code>}
        />
      )}
      {binding.compaction !== undefined && (
        <BindingFieldRow
          label="Compaction"
          value={<BindingScalarValue value={binding.compaction} />}
        />
      )}
      {binding['geo-replication'] && binding['geo-replication'].length > 0 && (
        <BindingFieldRow
          label="Geo Replication"
          value={<BindingScalarValue value={binding['geo-replication']} />}
        />
      )}
      {binding.retention && (
        <BindingFieldRow
          label="Retention"
          value={
            <BindingGroup title="Retention">
              <BindingFields>
                {binding.retention.time !== undefined && (
                  <BindingFieldRow
                    label="Time"
                    value={<BindingScalarValue value={binding.retention.time} />}
                  />
                )}
                {binding.retention.size !== undefined && (
                  <BindingFieldRow
                    label="Size"
                    value={<BindingScalarValue value={binding.retention.size} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
      {binding.ttl !== undefined && (
        <BindingFieldRow label="TTL" value={<BindingScalarValue value={binding.ttl} />} />
      )}
      {binding.deduplication !== undefined && (
        <BindingFieldRow
          label="Deduplication"
          value={<BindingScalarValue value={binding.deduplication} />}
        />
      )}
    </BindingFields>
  );
}

export const pulsarBinding = createBinding({
  label: 'Apache Pulsar',
  Channel: PulsarChannelBinding,
  getChannelSummary: getPulsarChannelSummary,
});
