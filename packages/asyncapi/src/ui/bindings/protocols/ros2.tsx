'use client';
import type { Ros2OperationBinding, Ros2ServerBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  BindingFields,
  BindingFieldRow,
  BindingGroup,
  BindingScalarValue,
} from '../shared';

function Ros2ServerBinding({ binding }: { binding: Ros2ServerBinding }) {
  return (
    <BindingFields>
      {binding.rmwImplementation && (
        <BindingFieldRow
          label="RMW Implementation"
          value={<code className="text-xs">{binding.rmwImplementation}</code>}
        />
      )}
      {binding.domainId !== undefined && (
        <BindingFieldRow
          label="Domain ID"
          value={<BindingScalarValue value={binding.domainId} />}
        />
      )}
    </BindingFields>
  );
}

/** durations of `-1` are infinite */
function Duration({ value }: { value: number }) {
  return <BindingScalarValue value={value === -1 ? 'infinite' : value} />;
}

function Ros2OperationBinding({ binding }: { binding: Ros2OperationBinding }) {
  const qos = binding.qosPolicies;

  return (
    <BindingFields>
      {binding.role && (
        <BindingFieldRow label="Role" value={<code className="text-xs">{binding.role}</code>} />
      )}
      {binding.node && (
        <BindingFieldRow label="Node" value={<code className="text-xs">{binding.node}</code>} />
      )}
      {qos && (
        <BindingFieldRow
          label="QoS Policies"
          value={
            <BindingGroup>
              <BindingFields>
                {qos.reliability && (
                  <BindingFieldRow
                    label="Reliability"
                    value={<code className="text-xs">{qos.reliability}</code>}
                  />
                )}
                {qos.history && (
                  <BindingFieldRow
                    label="History"
                    value={<code className="text-xs">{qos.history}</code>}
                  />
                )}
                {qos.durability && (
                  <BindingFieldRow
                    label="Durability"
                    value={<code className="text-xs">{qos.durability}</code>}
                  />
                )}
                {qos.liveliness && (
                  <BindingFieldRow
                    label="Liveliness"
                    value={<code className="text-xs">{qos.liveliness}</code>}
                  />
                )}
                {qos.lifespan !== undefined && (
                  <BindingFieldRow label="Lifespan" value={<Duration value={qos.lifespan} />} />
                )}
                {qos.deadline !== undefined && (
                  <BindingFieldRow label="Deadline" value={<Duration value={qos.deadline} />} />
                )}
                {qos.leaseDuration !== undefined && (
                  <BindingFieldRow
                    label="Lease Duration"
                    value={<Duration value={qos.leaseDuration} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
    </BindingFields>
  );
}

export const ros2Binding = createBinding({
  label: 'ROS 2',
  Server: Ros2ServerBinding,
  Operation: Ros2OperationBinding,
});
