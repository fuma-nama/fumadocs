'use client';
import type { SnsChannelBinding, SnsOperationBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  BindingTagList,
} from '../shared';

function SnsIdentifierFields({
  identifier,
  title,
}: {
  identifier: { url?: string; email?: string; phone?: string; arn?: string; name?: string };
  title: string;
}) {
  return (
    <BindingGroup title={title}>
      <BindingFields>
        {identifier.name && (
          <BindingFieldRow
            label="Name"
            value={<code className="text-xs">{identifier.name}</code>}
          />
        )}
        {identifier.arn && (
          <BindingFieldRow
            label="ARN"
            value={<code className="text-xs break-all">{identifier.arn}</code>}
          />
        )}
        {identifier.url && (
          <BindingFieldRow
            label="URL"
            value={<code className="text-xs break-all">{identifier.url}</code>}
          />
        )}
        {identifier.email && (
          <BindingFieldRow
            label="Email"
            value={<code className="text-xs">{identifier.email}</code>}
          />
        )}
        {identifier.phone && (
          <BindingFieldRow
            label="Phone"
            value={<code className="text-xs">{identifier.phone}</code>}
          />
        )}
      </BindingFields>
    </BindingGroup>
  );
}

function getSnsChannelSummary(binding: NoReference<SnsChannelBinding>): string | undefined {
  return binding.name;
}

function getSnsOperationSummary(binding: NoReference<SnsOperationBinding>): string | undefined {
  return binding.topic?.name ?? binding.topic?.arn;
}

function SnsChannelBinding({ binding }: { binding: NoReference<SnsChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.name && (
        <BindingFieldRow label="Name" value={<code className="text-xs">{binding.name}</code>} />
      )}
      {binding.ordering && (
        <BindingFieldRow
          label="Ordering"
          value={
            <BindingGroup title="FIFO Settings">
              <BindingFields>
                {binding.ordering.type && (
                  <BindingFieldRow
                    label="Type"
                    value={<BindingScalarValue value={binding.ordering.type} />}
                  />
                )}
                {binding.ordering.contentBasedDeduplication !== undefined && (
                  <BindingFieldRow
                    label="Content-Based Deduplication"
                    value={
                      <BindingScalarValue value={binding.ordering.contentBasedDeduplication} />
                    }
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
      {binding.tags && Object.keys(binding.tags).length > 0 && (
        <BindingFieldRow label="Tags" value={<BindingTagList value={binding.tags} />} />
      )}
    </BindingFields>
  );
}

function SnsOperationBinding({ binding }: { binding: NoReference<SnsOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.topic && (
        <BindingFieldRow
          label="Topic"
          value={<SnsIdentifierFields identifier={binding.topic} title="Topic" />}
        />
      )}
      {binding.consumers?.map((consumer, index) => (
        <BindingFieldRow
          key={index}
          label={`Consumer ${index + 1}`}
          value={
            <BindingGroup title={consumer.displayName ?? `Consumer ${index + 1}`}>
              <BindingFields>
                {consumer.protocol && (
                  <BindingFieldRow
                    label="Protocol"
                    value={<code className="text-xs">{consumer.protocol}</code>}
                  />
                )}
                {consumer.endpoint && (
                  <BindingFieldRow
                    label="Endpoint"
                    value={<SnsIdentifierFields identifier={consumer.endpoint} title="Endpoint" />}
                  />
                )}
                {consumer.rawMessageDelivery !== undefined && (
                  <BindingFieldRow
                    label="Raw Message Delivery"
                    value={<BindingScalarValue value={consumer.rawMessageDelivery} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      ))}
    </BindingFields>
  );
}

export const snsBinding = createBinding({
  label: 'Amazon SNS',
  Channel: SnsChannelBinding,
  Operation: SnsOperationBinding,
  getChannelSummary: getSnsChannelSummary,
  getOperationSummary: getSnsOperationSummary,
});
