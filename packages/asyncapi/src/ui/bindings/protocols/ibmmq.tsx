'use client';
import type {
  IbmmqChannelBinding,
  IbmmqMessageBinding,
  IbmmqServerBinding,
} from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, Row, ValueRow } from '../shared';

function IbmmqServerBinding({ binding }: { binding: IbmmqServerBinding }) {
  return (
    <Fields>
      <CodeRow label="Group ID" value={binding.groupId} />
      <CodeRow label="CCDT Queue Manager Name" value={binding.ccdtQueueManagerName} />
      <CodeRow label="Cipher Spec" value={binding.cipherSpec} />
      <ValueRow label="Multi Endpoint Server" value={binding.multiEndpointServer} />
      <ValueRow label="Heartbeat Interval" value={binding.heartBeatInterval} />
    </Fields>
  );
}

function IbmmqChannelBinding({ binding }: { binding: IbmmqChannelBinding }) {
  const { queue, topic } = binding;

  return (
    <Fields>
      <ValueRow label="Destination Type" value={binding.destinationType} />
      {queue && (
        <GroupRow label="Queue" title="Queue">
          <CodeRow label="Object Name" value={queue.objectName} />
          <ValueRow label="Partitioned" value={queue.isPartitioned} />
          <ValueRow label="Exclusive" value={queue.exclusive} />
        </GroupRow>
      )}
      {topic && (
        <GroupRow label="Topic" title="Topic">
          <CodeRow label="Topic String" value={topic.string} />
          <CodeRow label="Object Name" value={topic.objectName} />
          <ValueRow label="Durable Permitted" value={topic.durablePermitted} />
          <ValueRow label="Last Message Retained" value={topic.lastMsgRetained} />
        </GroupRow>
      )}
      <ValueRow label="Max Message Length" value={binding.maxMsgLength} />
    </Fields>
  );
}

function IbmmqMessageBinding({ binding }: { binding: IbmmqMessageBinding }) {
  return (
    <Fields>
      <ValueRow label="Type" value={binding.type} />
      <CodeRow label="Headers" value={binding.headers} />
      {binding.description && (
        <Row label="Description" value={<span className="text-sm">{binding.description}</span>} />
      )}
      <ValueRow label="Expiry" value={binding.expiry} />
    </Fields>
  );
}

export const ibmmqBinding = createBinding({
  label: 'IBM MQ',
  Server: IbmmqServerBinding,
  Channel: IbmmqChannelBinding,
  Message: IbmmqMessageBinding,
});
