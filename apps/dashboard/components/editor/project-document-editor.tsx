'use client';

import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { useEffect, useMemo, useState } from 'react';
import { Doc as YDoc } from 'yjs';

import { DocumentEditor } from '@/components/document-editor';
import { encodeDocumentName } from '@/lib/editor/document-name';
import { useDocumentQuery, useUploadAssetMutation } from '@/lib/editor/queries';
import { cn } from '@/lib/cn';

export function ProjectDocumentEditor({ projectId, path }: { projectId: string; path: string }) {
  const document = useDocumentQuery(projectId, path);
  const upload = useUploadAssetMutation(projectId);
  const ydoc = useMemo(() => new YDoc(), [projectId, path]);
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.Disconnected);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? 'ws://localhost:1234',
      name: encodeDocumentName(projectId, path),
      document: ydoc,
      token: null,
      onStatus: ({ status: next }) => setStatus(next),
      onSynced: ({ state }) => setSynced(state),
      onAuthenticationFailed: ({ reason }) => {
        console.error(`Hocuspocus authentication failed: ${reason}`);
      },
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [projectId, path, ydoc]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-fe-background">
      <header className="flex items-center justify-between border-b border-fe-border bg-fe-card px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fe-foreground">{path}</div>
          <div className="text-xs text-fe-muted-foreground">
            {status}
            {synced ? ' · saved by realtime sync' : ' · syncing changes'}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {document.isLoading ? (
          <div className="rounded-lg border border-fe-border bg-fe-card p-6 text-sm text-fe-muted-foreground">
            Loading document…
          </div>
        ) : document.isError ? (
          <div className="rounded-lg border border-fe-border bg-fe-card p-6 text-sm text-fe-destructive">
            Could not load document.
          </div>
        ) : document.data ? (
          <DocumentEditor
            className={cn('min-h-[calc(100vh-8rem)] w-full')}
            content={document.data.content}
            collaborationDocument={ydoc}
            uploadFile={(file) => upload.mutateAsync(file)}
            autoFocus
          />
        ) : (
          <div className="rounded-lg border border-fe-border bg-fe-card p-6 text-sm text-fe-muted-foreground">
            Document not found.
          </div>
        )}
      </div>
    </section>
  );
}
