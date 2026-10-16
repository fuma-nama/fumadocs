'use client';
import type { Ros2OperationBinding, Ros2ServerBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, ValueRow } from '../shared';

function Ros2ServerBinding({ binding }: { binding: Ros2ServerBinding }) {
  return (
    <Fields>
      <CodeRow label="RMW Implementation" value={binding.rmwImplementation} />
      <ValueRow label="Domain ID" value={binding.domainId} />
    </Fields>
  );
}

/** durations of `-1` are infinite */
function formatDuration(value?: number) {
  return value === -1 ? 'infinite' : value;
}

function Ros2OperationBinding({ binding }: { binding: Ros2OperationBinding }) {
  const qos = binding.qosPolicies;

  return (
    <Fields>
      <CodeRow label="Role" value={binding.role} />
      <CodeRow label="Node" value={binding.node} />
      {qos && (
        <GroupRow label="QoS Policies">
          <CodeRow label="Reliability" value={qos.reliability} />
          <CodeRow label="History" value={qos.history} />
          <CodeRow label="Durability" value={qos.durability} />
          <CodeRow label="Liveliness" value={qos.liveliness} />
          <ValueRow label="Lifespan" value={formatDuration(qos.lifespan)} />
          <ValueRow label="Deadline" value={formatDuration(qos.deadline)} />
          <ValueRow label="Lease Duration" value={formatDuration(qos.leaseDuration)} />
        </GroupRow>
      )}
    </Fields>
  );
}

export const ros2Binding = createBinding({
  label: 'ROS 2',
  Server: Ros2ServerBinding,
  Operation: Ros2OperationBinding,
});
