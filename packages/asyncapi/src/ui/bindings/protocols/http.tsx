'use client';
import type { HttpMessageBinding, HttpOperationBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  BindingFields,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

// `query` is rendered with the other parameters of the operation
function HttpOperationBinding({ binding }: { binding: HttpOperationBinding }) {
  if (!binding.method) return null;

  return (
    <BindingFields>
      <BindingFieldRow label="HTTP Method" value={<BindingScalarValue value={binding.method} />} />
    </BindingFields>
  );
}

function HttpMessageBinding({ binding }: { binding: HttpMessageBinding }) {
  return (
    <BindingFields>
      {binding.headers && (
        <BindingFieldRow
          label="Headers"
          value={<BindingSchema name="headers" schema={binding.headers} />}
        />
      )}
      {binding.statusCode !== undefined && (
        <BindingFieldRow
          label="Status Code"
          value={<BindingScalarValue value={binding.statusCode} />}
        />
      )}
    </BindingFields>
  );
}

export const httpBinding = createBinding({
  label: 'HTTP',
  Operation: HttpOperationBinding,
  Message: HttpMessageBinding,
});
