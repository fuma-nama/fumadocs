'use client';
import type { SolaceOperationBinding, SolaceServerBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  BindingFields,
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

function SolaceServerBinding({ binding }: { binding: SolaceServerBinding }) {
  return (
    <BindingFields>
      {binding.msgVpn && (
        <BindingFieldRow
          label="Message VPN"
          value={<code className="text-xs">{binding.msgVpn}</code>}
        />
      )}
      {binding.clientName && (
        <BindingFieldRow
          label="Client Name"
          value={<code className="text-xs">{binding.clientName}</code>}
        />
      )}
    </BindingFields>
  );
}

function SolaceOperationBinding({ binding }: { binding: SolaceOperationBinding }) {
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
                {destination.queue?.accessType && (
                  <BindingFieldRow
                    label="Access Type"
                    value={<code className="text-xs">{destination.queue.accessType}</code>}
                  />
                )}
                {destination.queue?.maxMsgSpoolSize && (
                  <BindingFieldRow
                    label="Max Message Spool Size"
                    value={<code className="text-xs">{destination.queue.maxMsgSpoolSize}</code>}
                  />
                )}
                {destination.queue?.maxTtl && (
                  <BindingFieldRow
                    label="Max TTL"
                    value={<code className="text-xs">{destination.queue.maxTtl}</code>}
                  />
                )}
                {destination.topic?.topicSubscriptions && (
                  <BindingFieldRow
                    label="Topic Subscriptions"
                    value={<BindingScalarValue value={destination.topic.topicSubscriptions} />}
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
  Server: SolaceServerBinding,
  Operation: SolaceOperationBinding,
});
