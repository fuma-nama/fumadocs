'use client';
import type { GooglepubsubChannelBinding, GooglepubsubMessageBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, TagsRow, ValueRow } from '../shared';

function GooglepubsubChannelBinding({ binding }: { binding: GooglepubsubChannelBinding }) {
  const { schemaSettings } = binding;

  return (
    <Fields>
      <TagsRow label="Labels" value={binding.labels} />
      <CodeRow label="Message Retention" value={binding.messageRetentionDuration} />
      <ValueRow
        label="Storage Policy"
        value={binding.messageStoragePolicy?.allowedPersistenceRegions}
      />
      {schemaSettings && (
        <GroupRow label="Schema Settings" title="Schema">
          <CodeRow label="Name" value={schemaSettings.name} />
          <CodeRow label="Encoding" value={schemaSettings.encoding} />
          <CodeRow label="First Revision ID" value={schemaSettings.firstRevisionId} />
          <CodeRow label="Last Revision ID" value={schemaSettings.lastRevisionId} />
        </GroupRow>
      )}
    </Fields>
  );
}

function GooglepubsubMessageBinding({ binding }: { binding: GooglepubsubMessageBinding }) {
  return (
    <Fields>
      <TagsRow label="Attributes" value={binding.attributes} />
      <CodeRow label="Ordering Key" value={binding.orderingKey} />
      <CodeRow label="Schema" value={binding.schema?.name} />
    </Fields>
  );
}

export const googlepubsubBinding = createBinding({
  label: 'Google Pub/Sub',
  Channel: GooglepubsubChannelBinding,
  Message: GooglepubsubMessageBinding,
});
