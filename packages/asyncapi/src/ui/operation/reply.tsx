'use client';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { type OperationReply, useOperation } from '@/operation';
import { DirectionBadge } from '@/ui/components/direction';
import { Markdown } from '@/ui/components/markdown';
import { Address } from './connection';
import { MessageList } from './messages';
import { SectionHeader } from './section';

/**
 * The reply of a request, it goes the other way of the operation.
 */
export function ReplySection({
  reply,
  headingLevel,
}: {
  reply: OperationReply;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const operation = useOperation();
  const { address, channel, messages } = reply;
  let to: ReactNode;
  if (address) {
    to = (
      <p>
        {t.jsx('Sent to the address at {location} of the request.', {
          variables: { location: <code>{address.location}</code> },
        })}
      </p>
    );
  } else if (channel === operation.channel) {
    to = <p>{t('Sent back on the same channel.')}</p>;
  } else if (channel?.address) {
    to = (
      <div className="not-prose flex flex-wrap items-center gap-2 text-sm">
        {t('Sent to')}
        <Address value={channel.address} className="font-mono text-[0.8125rem]" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader id="reply" depth={headingLevel} title={t('Reply')}>
        <DirectionBadge action={operation.action === 'send' ? 'receive' : 'send'} />
      </SectionHeader>
      {to && (
        <div className="mb-3 text-fd-muted-foreground prose-no-margin">
          {to}
          {address?.description && <Markdown md={address.description} />}
        </div>
      )}
      <MessageList id="reply" messages={messages} headingLevel={headingLevel + 1} />
    </>
  );
}
