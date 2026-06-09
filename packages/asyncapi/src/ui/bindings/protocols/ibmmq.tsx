'use client';
import type {
  IbmmqChannelBinding,
  IbmmqMessageBinding,
  IbmmqServerBinding,
} from '@/types/asyncapi-3';
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

function getIbmmqServerSummary(binding: NoReference<IbmmqServerBinding>): string | undefined {
  return joinBindingSummary(binding.groupId, binding.ccdtQueueManagerName);
}

function getIbmmqChannelSummary(binding: NoReference<IbmmqChannelBinding>): string | undefined {
  return joinBindingSummary(
    binding.destinationType,
    binding.queue?.objectName,
    binding.topic?.string,
  );
}

function getIbmmqMessageSummary(binding: NoReference<IbmmqMessageBinding>): string | undefined {
  return binding.type;
}

function IbmmqServerBinding({ binding }: { binding: NoReference<IbmmqServerBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.groupId && (
        <BindingFieldRow
          label="Group ID"
          value={<code className="text-xs">{binding.groupId}</code>}
        />
      )}
      {binding.ccdtQueueManagerName && (
        <BindingFieldRow
          label="CCDT Queue Manager Name"
          value={<code className="text-xs">{binding.ccdtQueueManagerName}</code>}
        />
      )}
      {binding.cipherSpec && (
        <BindingFieldRow
          label="Cipher Spec"
          value={<code className="text-xs">{binding.cipherSpec}</code>}
        />
      )}
      {binding.multiEndpointServer !== undefined && (
        <BindingFieldRow
          label="Multi Endpoint Server"
          value={<BindingScalarValue value={binding.multiEndpointServer} />}
        />
      )}
      {binding.heartBeatInterval !== undefined && (
        <BindingFieldRow
          label="Heartbeat Interval"
          value={<BindingScalarValue value={binding.heartBeatInterval} />}
        />
      )}
    </BindingFields>
  );
}

function IbmmqChannelBinding({ binding }: { binding: NoReference<IbmmqChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.destinationType && (
        <BindingFieldRow
          label="Destination Type"
          value={<BindingScalarValue value={binding.destinationType} />}
        />
      )}
      {binding.queue && (
        <BindingFieldRow
          label="Queue"
          value={
            <BindingGroup title="Queue">
              <BindingFields>
                {binding.queue.objectName && (
                  <BindingFieldRow
                    label="Object Name"
                    value={<code className="text-xs">{binding.queue.objectName}</code>}
                  />
                )}
                {binding.queue.isPartitioned !== undefined && (
                  <BindingFieldRow
                    label="Partitioned"
                    value={<BindingScalarValue value={binding.queue.isPartitioned} />}
                  />
                )}
                {binding.queue.exclusive !== undefined && (
                  <BindingFieldRow
                    label="Exclusive"
                    value={<BindingScalarValue value={binding.queue.exclusive} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
      {binding.topic && (
        <BindingFieldRow
          label="Topic"
          value={
            <BindingGroup title="Topic">
              <BindingFields>
                {binding.topic.string && (
                  <BindingFieldRow
                    label="Topic String"
                    value={<code className="text-xs">{binding.topic.string}</code>}
                  />
                )}
                {binding.topic.objectName && (
                  <BindingFieldRow
                    label="Object Name"
                    value={<code className="text-xs">{binding.topic.objectName}</code>}
                  />
                )}
                {binding.topic.durablePermitted !== undefined && (
                  <BindingFieldRow
                    label="Durable Permitted"
                    value={<BindingScalarValue value={binding.topic.durablePermitted} />}
                  />
                )}
                {binding.topic.lastMsgRetained !== undefined && (
                  <BindingFieldRow
                    label="Last Message Retained"
                    value={<BindingScalarValue value={binding.topic.lastMsgRetained} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
      {binding.maxMsgLength !== undefined && (
        <BindingFieldRow
          label="Max Message Length"
          value={<BindingScalarValue value={binding.maxMsgLength} />}
        />
      )}
    </BindingFields>
  );
}

function IbmmqMessageBinding({ binding }: { binding: NoReference<IbmmqMessageBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.type && (
        <BindingFieldRow label="Type" value={<BindingScalarValue value={binding.type} />} />
      )}
      {binding.headers && (
        <BindingFieldRow
          label="Headers"
          value={<code className="text-xs">{binding.headers}</code>}
        />
      )}
      {binding.description && (
        <BindingFieldRow
          label="Description"
          value={<span className="text-sm">{binding.description}</span>}
        />
      )}
      {binding.expiry !== undefined && (
        <BindingFieldRow label="Expiry" value={<BindingScalarValue value={binding.expiry} />} />
      )}
    </BindingFields>
  );
}
export const ibmmqBinding = createBinding({
  label: 'IBM MQ',
  Server: IbmmqServerBinding,
  Channel: IbmmqChannelBinding,
  Message: IbmmqMessageBinding,
  getServerSummary: getIbmmqServerSummary,
  getChannelSummary: getIbmmqChannelSummary,
  getMessageSummary: getIbmmqMessageSummary,
});
