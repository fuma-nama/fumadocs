'use client';
import type { SqsChannelBinding, SqsOperationBinding } from '@/types/asyncapi-3';
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
        {queue.tags && Object.keys(queue.tags).length > 0 && (
          <BindingFieldRow label="Tags" value={<BindingTagList value={queue.tags} />} />
        )}
      </BindingFields>
    </BindingGroup>
  );
}

function getSqsChannelSummary(binding: NoReference<SqsChannelBinding>): string | undefined {
  return binding.queue?.name;
}

function getSqsOperationSummary(binding: NoReference<SqsOperationBinding>): string | undefined {
  const queues = binding.queues;
  if (!queues || queues.length === 0) return undefined;
  const first = queues[0];
  if (!first?.name) return undefined;
  return queues.length > 1 ? `${first.name} +${queues.length - 1}` : first.name;
}

function SqsChannelBinding({ binding }: { binding: NoReference<SqsChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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

function SqsOperationBinding({ binding }: { binding: NoReference<SqsOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  getChannelSummary: getSqsChannelSummary,
  getOperationSummary: getSqsOperationSummary,
});
