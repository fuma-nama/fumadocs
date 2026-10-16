'use client';
import type { SqsChannelBinding, SqsOperationBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, JsonRow, TagsRow, ValueRow } from '../shared';

function Queue({
  label,
  title,
  queue,
}: {
  label: string;
  title: string;
  queue: NonNullable<SqsChannelBinding['queue']>;
}) {
  return (
    <GroupRow label={label} title={title}>
      <CodeRow label="Name" value={queue.name} />
      <ValueRow label="FIFO Queue" value={queue.fifoQueue} />
      <CodeRow label="Deduplication Scope" value={queue.deduplicationScope} />
      <CodeRow label="FIFO Throughput Limit" value={queue.fifoThroughputLimit} />
      <ValueRow label="Delivery Delay" value={queue.deliveryDelay} />
      <ValueRow label="Receive Message Wait Time" value={queue.receiveMessageWaitTime} />
      <ValueRow label="Visibility Timeout" value={queue.visibilityTimeout} />
      <ValueRow label="Message Retention Period" value={queue.messageRetentionPeriod} />
      <JsonRow label="Redrive Policy" value={queue.redrivePolicy} />
      <JsonRow label="Policy" value={queue.policy} />
      <TagsRow label="Tags" value={queue.tags} />
    </GroupRow>
  );
}

function SqsChannelBinding({ binding }: { binding: SqsChannelBinding }) {
  return (
    <Fields>
      {binding.queue && <Queue label="Queue" title="Queue" queue={binding.queue} />}
      {binding.deadLetterQueue && (
        <Queue
          label="Dead Letter Queue"
          title="Dead Letter Queue"
          queue={binding.deadLetterQueue}
        />
      )}
    </Fields>
  );
}

function SqsOperationBinding({ binding }: { binding: SqsOperationBinding }) {
  return (
    <Fields>
      {binding.queues?.map((queue, index) => (
        <Queue
          key={index}
          label={`Queue ${index + 1}`}
          title={queue.name ?? `Queue ${index + 1}`}
          queue={queue}
        />
      ))}
    </Fields>
  );
}

export const sqsBinding = createBinding({
  label: 'Amazon SQS',
  Channel: SqsChannelBinding,
  Operation: SqsOperationBinding,
});
