'use client';
import type { SolaceOperationBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

function formatDeliveryMode(value: string): string {
  if (value === 'direct') return 'Direct';
  if (value === 'persistent') return 'Persistent';
  return value;
}

function getSolaceOperationSummary(
  binding: NoReference<SolaceOperationBinding>,
): string | undefined {
  const count = binding.destinations?.length ?? 0;
  if (count === 0) return undefined;
  return `${count} destination${count > 1 ? 's' : ''}`;
}

function SolaceOperationBinding({ binding }: { binding: NoReference<SolaceOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.destinations?.map((destination, index) => (
        <BindingFieldRow
          key={index}
          label={`Destination ${index + 1}`}
          value={
            <BindingGroup
              title={
                destination.queue?.name ??
                destination.topic?.topicSubscriptions?.[0] ??
                `Destination ${index + 1}`
              }
            >
              <BindingFields>
                {destination.destinationType && (
                  <BindingFieldRow
                    label="Destination Type"
                    value={<code className="text-xs">{destination.destinationType}</code>}
                  />
                )}
                {destination.deliveryMode && (
                  <BindingFieldRow
                    label="Delivery Mode"
                    value={
                      <code className="text-xs">
                        {formatDeliveryMode(destination.deliveryMode)}
                      </code>
                    }
                  />
                )}
                {destination.queue?.name && (
                  <BindingFieldRow
                    label="Queue Name"
                    value={<code className="text-xs">{destination.queue.name}</code>}
                  />
                )}
                {destination.queue?.topicSubscriptions && (
                  <BindingFieldRow
                    label="Topic Subscriptions"
                    value={<BindingScalarValue value={destination.queue.topicSubscriptions} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      ))}
      {binding.timeToLive !== undefined && (
        <BindingFieldRow
          label="Time to Live"
          value={
            typeof binding.timeToLive === 'object' ? (
              <BindingSchema name="timeToLive" schema={binding.timeToLive} />
            ) : (
              <BindingScalarValue value={binding.timeToLive} />
            )
          }
        />
      )}
      {binding.priority !== undefined && (
        <BindingFieldRow
          label="Priority"
          value={
            typeof binding.priority === 'object' ? (
              <BindingSchema name="priority" schema={binding.priority} />
            ) : (
              <BindingScalarValue value={binding.priority} />
            )
          }
        />
      )}
      {binding.dmqEligible !== undefined && (
        <BindingFieldRow
          label="DMQ Eligible"
          value={<BindingScalarValue value={binding.dmqEligible} />}
        />
      )}
    </BindingFields>
  );
}

export const solaceBinding = createBinding({
  label: 'Solace',
  Operation: SolaceOperationBinding,
  getOperationSummary: getSolaceOperationSummary,
});
