'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import {
  getChannelMessages,
  getServers,
  lazy,
  type OperationInfo,
  type OperationMessage,
  resolveOperation,
  type SecurityRequirement,
  toRequirements,
} from '@/utils/schema';
import { useAsyncAPI } from '@/utils/create-page';
import { ServerProvider, useServer } from '@/utils/use-server';

export type {
  MessageSchema,
  OperationInfo,
  OperationMessage,
  OperationParameter,
  OperationReply,
  SecurityRequirement,
} from '@/utils/schema';

/** props of the component rendering an operation of a page */
export interface PageOperationProps {
  id: string;
  showTitle?: boolean;
  showDescription?: boolean;
  /** the anchor of operation when titles are shown, unique in the page */
  anchor?: string;
}

export interface OperationProviderProps extends Pick<PageOperationProps, 'id'> {
  children: ReactNode;
}

const OperationContext = createContext<OperationInfo | null>(null);

export function OperationProvider({ id, children }: OperationProviderProps) {
  const { doc, storageKeyPrefix } = useAsyncAPI();
  const { info, servers } = useMemo(() => {
    const info = resolveOperation(doc.dereferenced, id);
    if (!info) throw new Error(`[Fumadocs AsyncAPI] Operation not found in schema: ${id}`);
    const { channel } = info;

    return {
      info,
      // absent or empty: available on all servers of the page
      servers:
        channel.servers && channel.servers.length > 0
          ? getServers(doc.dereferenced, channel)
          : undefined,
    };
  }, [doc, id]);

  const content = <OperationContext value={info}>{children}</OperationContext>;
  if (!servers) return content;

  return (
    <ServerProvider servers={servers} storageKeyPrefix={storageKeyPrefix}>
      {content}
    </ServerProvider>
  );
}

export function useOperation(): OperationInfo {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}

export interface ChannelMessages {
  /** sent by the application, received by readers */
  incoming: OperationMessage[];
  /** received by the application, sent by readers */
  outgoing: OperationMessage[];
}

/**
 * Messages of all operations on the channel of operation, including replies on the channel. The messages of operation come first.
 */
export function useChannelMessages(): ChannelMessages {
  const { doc } = useAsyncAPI();
  const info = useOperation();

  return useMemo(() => {
    const out = {} as ChannelMessages;
    // computed on first access, pages can have many operations on the same channel
    lazy(out, 'incoming', () => getChannelMessages(doc.dereferenced, info, true));
    lazy(out, 'outgoing', () => getChannelMessages(doc.dereferenced, info, false));

    return out;
  }, [doc, info]);
}

export interface OperationSecurity {
  /** to connect to the selected server, one of them is required */
  server: SecurityRequirement[];
  /** to perform the operation, one of them is required besides the server's */
  operation: SecurityRequirement[];
}

/**
 * The security requirements of the selected server and the operation, both must be satisfied.
 */
export function useOperationSecurity(): OperationSecurity {
  const { operation } = useOperation();
  const { server, servers } = useServer();

  return {
    server: toRequirements(server ? servers[server.id]?.security : undefined),
    operation: toRequirements(operation.security),
  };
}
