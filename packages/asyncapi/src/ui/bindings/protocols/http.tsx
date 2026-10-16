'use client';
import type { HttpMessageBinding, HttpOperationBinding } from '@/types/asyncapi-3';
import { createBinding, Fields, SchemaRow, ValueRow } from '../shared';

// `query` is rendered with the other parameters of the operation
function HttpOperationBinding({ binding }: { binding: HttpOperationBinding }) {
  if (!binding.method) return null;

  return (
    <Fields>
      <ValueRow label="HTTP Method" value={binding.method} />
    </Fields>
  );
}

function HttpMessageBinding({ binding }: { binding: HttpMessageBinding }) {
  return (
    <Fields>
      <SchemaRow label="Headers" name="headers" value={binding.headers} />
      <ValueRow label="Status Code" value={binding.statusCode} />
    </Fields>
  );
}

export const httpBinding = createBinding({
  label: 'HTTP',
  Operation: HttpOperationBinding,
  Message: HttpMessageBinding,
});
