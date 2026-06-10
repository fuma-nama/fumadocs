'use client';
import type { GooglepubsubChannelBinding, GooglepubsubMessageBinding } from '@/types/asyncapi-3';
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

function getGooglepubsubChannelSummary(
  binding: NoReference<GooglepubsubChannelBinding>,
): string | undefined {
  return binding.schemaSettings?.name;
}

function getGooglepubsubMessageSummary(
  binding: NoReference<GooglepubsubMessageBinding>,
): string | undefined {
  return binding.orderingKey;
}

function GooglepubsubChannelBinding({
  binding,
}: {
  binding: NoReference<GooglepubsubChannelBinding>;
}) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.labels && Object.keys(binding.labels).length > 0 && (
        <BindingFieldRow label="Labels" value={<BindingTagList value={binding.labels} />} />
      )}
      {binding.messageRetentionDuration && (
        <BindingFieldRow
          label="Message Retention"
          value={<code className="text-xs">{binding.messageRetentionDuration}</code>}
        />
      )}
      {binding.messageStoragePolicy?.allowedPersistenceRegions && (
        <BindingFieldRow
          label="Storage Policy"
          value={
            <BindingScalarValue value={binding.messageStoragePolicy.allowedPersistenceRegions} />
          }
        />
      )}
      {binding.schemaSettings && (
        <BindingFieldRow
          label="Schema Settings"
          value={
            <BindingGroup title="Schema">
              <BindingFields>
                {binding.schemaSettings.name && (
                  <BindingFieldRow
                    label="Name"
                    value={<code className="text-xs">{binding.schemaSettings.name}</code>}
                  />
                )}
                {binding.schemaSettings.encoding && (
                  <BindingFieldRow
                    label="Encoding"
                    value={<code className="text-xs">{binding.schemaSettings.encoding}</code>}
                  />
                )}
                {binding.schemaSettings.firstRevisionId && (
                  <BindingFieldRow
                    label="First Revision ID"
                    value={
                      <code className="text-xs">{binding.schemaSettings.firstRevisionId}</code>
                    }
                  />
                )}
                {binding.schemaSettings.lastRevisionId && (
                  <BindingFieldRow
                    label="Last Revision ID"
                    value={<code className="text-xs">{binding.schemaSettings.lastRevisionId}</code>}
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

function GooglepubsubMessageBinding({
  binding,
}: {
  binding: NoReference<GooglepubsubMessageBinding>;
}) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.attributes && Object.keys(binding.attributes).length > 0 && (
        <BindingFieldRow label="Attributes" value={<BindingTagList value={binding.attributes} />} />
      )}
      {binding.orderingKey && (
        <BindingFieldRow
          label="Ordering Key"
          value={<code className="text-xs">{binding.orderingKey}</code>}
        />
      )}
      {binding.schema?.name && (
        <BindingFieldRow
          label="Schema"
          value={<code className="text-xs">{binding.schema.name}</code>}
        />
      )}
    </BindingFields>
  );
}
export const googlepubsubBinding = createBinding({
  label: 'Google Pub/Sub',
  Channel: GooglepubsubChannelBinding,
  Message: GooglepubsubMessageBinding,
  getChannelSummary: getGooglepubsubChannelSummary,
  getMessageSummary: getGooglepubsubMessageSummary,
});
