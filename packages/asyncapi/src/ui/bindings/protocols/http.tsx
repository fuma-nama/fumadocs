'use client';
import type { HttpMessageBinding, HttpOperationBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

function getHttpOperationSummary(binding: HttpOperationBinding): string | undefined {
  return binding.method;
}

function getHttpMessageSummary(binding: HttpMessageBinding): string | undefined {
  return typeof binding.statusCode === 'number' ? String(binding.statusCode) : undefined;
}

function HttpOperationBinding({ binding }: { binding: HttpOperationBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.method && (
        <BindingFieldRow
          label="HTTP Method"
          value={<BindingScalarValue value={binding.method} />}
        />
      )}
      {binding.query && (
        <BindingFieldRow
          label="Query Parameters"
          value={<BindingSchema name="query" schema={binding.query} />}
        />
      )}
    </BindingFields>
  );
}

function HttpMessageBinding({ binding }: { binding: HttpMessageBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  getOperationSummary: getHttpOperationSummary,
  getMessageSummary: getHttpMessageSummary,
});
