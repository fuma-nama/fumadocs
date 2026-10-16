'use client';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { AnchorSection } from 'shared-api/auto-anchor';
import { type PageOperationProps, OperationProvider, useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '@/ui/components/markdown';
import { ProtocolSection } from '@/ui/bindings';
import { PlaygroundClient } from '@/ui/playground';
import { ConnectionBar } from './connection';
import { AuthSection } from './auth';
import { ParametersSection } from './parameters';
import { MessagesSection } from './messages';
import { ReplySection } from './reply';
import { ExternalDocs } from './section';
import { CodeUsages } from './usage';

export function Operation({ id, ...props }: PageOperationProps) {
  return (
    <OperationProvider id={id}>
      <OperationContent {...props} />
    </OperationProvider>
  );
}

function OperationContent({ showTitle, showDescription, anchor }: Omit<PageOperationProps, 'id'>) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const { operation, channel, action, title, description, messages, reply } = useOperation();
  // the channel describes what its operations share, unless the operation repeats it
  const channelDescription = channel.description !== description ? channel.description : undefined;
  const hasText = (showDescription && description) || channelDescription;
  let headingLevel = 2;
  let header: ReactNode = null;

  if (showTitle) {
    header = (
      // the anchor of operation itself
      <Heading id="" depth={headingLevel} className="mt-0! mb-4">
        {title}
      </Heading>
    );
    headingLevel++;
  }

  const slots = {
    header,
    connection: ctx.playground?.enabled === false ? <ConnectionBar /> : <PlaygroundClient />,
    description:
      hasText || operation.externalDocs ? (
        <div className="my-6 flex flex-col gap-3">
          {hasText && (
            <div className="prose-no-margin">
              {showDescription && description && <Markdown md={description} />}
              {channelDescription && <Markdown md={channelDescription} />}
            </div>
          )}
          <ExternalDocs docs={operation.externalDocs} />
        </div>
      ) : null,
    usage: <CodeUsages />,
    authSchemes: <AuthSection headingLevel={headingLevel} />,
    parameters: <ParametersSection headingLevel={headingLevel} />,
    messages: messages.length > 0 && (
      <MessagesSection
        id="messages"
        title={t('Messages')}
        messages={messages}
        headingLevel={headingLevel}
      />
    ),
    reply: reply && <ReplySection reply={reply} headingLevel={headingLevel} />,
    bindings: <ProtocolSection headingLevel={headingLevel} />,
  };

  let content: ReactNode;
  if (ctx.content?.renderOperationLayout) {
    content = ctx.content.renderOperationLayout(slots, { operation, action, ctx });
  } else {
    content = (
      <div>
        <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
          <div className="min-w-0 flex-1">
            {slots.header}
            {slots.connection}
            {slots.description}
            {slots.authSchemes}
            {slots.parameters}
          </div>
          {/* empty when no code sample supports the server */}
          <div className="empty:hidden @4xl:sticky @4xl:top-[calc(var(--fd-docs-row-3,0px)+1rem)] @4xl:flex @4xl:max-h-[calc(var(--fd-docs-height,100dvh)-var(--fd-docs-row-3,0px)-2rem)] @4xl:w-[400px] @4xl:flex-col">
            {slots.usage}
          </div>
        </div>
        {/* messages lay out their examples beside them */}
        {slots.messages}
        {slots.reply}
        {slots.bindings}
      </div>
    );
  }

  // ids of sections are unique when a page has several operations
  if (showTitle) return <AnchorSection segments={[anchor ?? title]}>{content}</AnchorSection>;
  return content;
}
