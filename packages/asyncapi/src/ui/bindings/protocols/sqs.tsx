'use client';
import type { SqsChannelBinding, SqsOperationBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  BindingFields,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  BindingTagList,
  BindingJson,
} from '../shared';

type SqsQueue = NonNullable<SqsChannelBinding['queue']>;

function SqsQueueFields({ queue, title }: { queue: SqsQueue; title: string }) {
  return (
    <BindingGroup title={title}>
      <BindingFields>
        {queue.name && (
          <BindingFieldRow label="Name" value={<code className="text-xs">{queue.name}</code>} />
        )}
        {queue.fifoQueue !== undefined && (
          <BindingFieldRow
            label="FIFO Queue"
            value={<BindingScalarValue value={queue.fifoQueue} />}
          />
        )}
        {queue.deduplicationScope && (
          <BindingFieldRow
            label="Deduplication Scope"
            value={<code className="text-xs">{queue.deduplicationScope}</code>}
          />
        )}
        {queue.fifoThroughputLimit && (
          <BindingFieldRow
            label="FIFO Throughput Limit"
            value={<code className="text-xs">{queue.fifoThroughputLimit}</code>}
          />
        )}
        {queue.deliveryDelay !== undefined && (
          <BindingFieldRow
            label="Delivery Delay"
            value={<BindingScalarValue value={queue.deliveryDelay} />}
          />
        )}
        {queue.receiveMessageWaitTime !== undefined && (
          <BindingFieldRow
            label="Receive Message Wait Time"
            value={<BindingScalarValue value={queue.receiveMessageWaitTime} />}
          />
        )}
        {queue.visibilityTimeout !== undefined && (
          <BindingFieldRow
            label="Visibility Timeout"
            value={<BindingScalarValue value={queue.visibilityTimeout} />}
          />
        )}
        {queue.messageRetentionPeriod !== undefined && (
          <BindingFieldRow
            label="Message Retention Period"
            value={<BindingScalarValue value={queue.messageRetentionPeriod} />}
          />
        )}
        {queue.redrivePolicy && (
          <BindingFieldRow
            label="Redrive Policy"
            value={<BindingJson value={queue.redrivePolicy} />}
          />
        )}
        {queue.policy && (
          <BindingFieldRow label="Policy" value={<BindingJson value={queue.policy} />} />
        )}
        {queue.tags && Object.keys(queue.tags).length > 0 && (
          <BindingFieldRow label="Tags" value={<BindingTagList value={queue.tags} />} />
        )}
      </BindingFields>
    </BindingGroup>
  );
}

function SqsChannelBinding({ binding }: { binding: SqsChannelBinding }) {
  return (
    <BindingFields>
      {binding.queue && (
        <BindingFieldRow
          label="Queue"
          value={<SqsQueueFields queue={binding.queue} title="Queue" />}
        />
      )}
      {binding.deadLetterQueue && (
        <BindingFieldRow
          label="Dead Letter Queue"
          value={<SqsQueueFields queue={binding.deadLetterQueue} title="Dead Letter Queue" />}
        />
      )}
    </BindingFields>
  );
}

function SqsOperationBinding({ binding }: { binding: SqsOperationBinding }) {
  return (
    <BindingFields>
      {binding.queues?.map((queue, index) => (
        <BindingFieldRow
          key={index}
          label={`Queue ${index + 1}`}
          value={<SqsQueueFields queue={queue} title={queue.name ?? `Queue ${index + 1}`} />}
        />
      ))}
    </BindingFields>
  );
}

export const sqsBinding = createBinding({
  label: 'Amazon SQS',
  Channel: SqsChannelBinding,
  Operation: SqsOperationBinding,
});
