'use client';

import { FileTree, useFileTree } from '@pierre/trees/react';
import { FilePlus, FolderTree, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { MenuContent, MenuItem } from '@/components/ui/menu';
import {
  useCreateFileMutation,
  useDeletePathMutation,
  useMovePathMutation,
  useProjectTreeQuery,
} from '@/lib/editor/queries';

export function FileTreePanel({
  projectId,
  selectedPath,
  onSelectFile,
}: {
  projectId: string;
  selectedPath: string;
  onSelectFile: (path: string) => void;
}) {
  const [draftParent, setDraftParent] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const tree = useProjectTreeQuery(projectId);
  const createFile = useCreateFileMutation(projectId);
  const movePath = useMovePathMutation(projectId);
  const deletePath = useDeletePathMutation(projectId);

  const allPaths = useMemo(() => tree.data?.entries.map((entry) => entry.path) ?? [], [tree.data]);
  const paths = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allPaths;
    return allPaths.filter((path) => path.toLowerCase().includes(query));
  }, [allPaths, searchQuery]);
  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const path of paths) {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const folder = parts.slice(0, i).join('/');
        set.add(folder);
        set.add(`${folder}/`);
      }
    }
    return set;
  }, [paths]);
  const foldersRef = useRef(folders);
  const selectedPathRef = useRef(selectedPath);
  const onSelectFileRef = useRef(onSelectFile);

  foldersRef.current = folders;
  selectedPathRef.current = selectedPath;
  onSelectFileRef.current = onSelectFile;

  function parentPath(path: string) {
    return normalizeTreePath(path).split('/').slice(0, -1).join('/');
  }

  function normalizeTreePath(path: string) {
    return path.replace(/\/+$/g, '');
  }

  function normalizeDraftPath(value: string) {
    const normalized = value
      .replaceAll('\\', '/')
      .split('/')
      .filter((segment) => segment.length > 0 && segment !== '.')
      .join('/');

    if (!normalized) return '';
    if (normalized.endsWith('.md') || normalized.endsWith('.mdx')) return normalized;
    return `${normalized}.mdx`;
  }

  function startCreate(parent = '') {
    setDraftParent(parent);
    setDraftName('');
  }

  function cancelCreate() {
    setDraftParent(null);
    setDraftName('');
  }

  function submitCreate() {
    const filePath = normalizeDraftPath(draftName);
    if (!filePath) return;

    const path = draftParent ? `${draftParent}/${filePath}` : filePath;
    createFile.mutate(
      { path },
      {
        onSuccess() {
          cancelCreate();
          onSelectFile(path);
        },
      },
    );
  }

  const model = useFileTree({
    paths,
    density: 'compact',
    search: false,
    initialExpansion: 'open',
    flattenEmptyDirectories: true,
    composition: {
      contextMenu: {
        enabled: true,
      },
    },
    initialSelectedPaths: selectedPath ? [selectedPath] : [],
    onSelectionChange(selected) {
      const path = selected[0];
      if (!path) return;
      if (foldersRef.current.has(path)) return;

      const normalizedPath = normalizeTreePath(path);
      if (normalizedPath === selectedPathRef.current) return;
      onSelectFileRef.current(normalizedPath);
    },
    dragAndDrop: {
      canDrag: (items) => items.length === 1,
      onDropComplete(event) {
        const from = event.draggedPaths[0] ? normalizeTreePath(event.draggedPaths[0]) : undefined;
        const directory = event.target.directoryPath
          ? normalizeTreePath(event.target.directoryPath)
          : '';
        if (!from) return;
        const filename = from.split('/').at(-1) ?? from;
        const to = directory ? `${directory}/${filename}` : filename;
        if (from !== to) {
          movePath.mutate({
            from,
            to,
            recursive: foldersRef.current.has(from) || foldersRef.current.has(`${from}/`),
          });
        }
      },
    },
    renaming: {
      onRename(event) {
        movePath.mutate({
          from: event.sourcePath,
          to: event.destinationPath,
          recursive: event.isFolder,
        });
      },
    },
  });

  useEffect(() => {
    model.model.resetPaths(paths);
  }, [model.model, paths]);

  useEffect(() => {
    const normalizedSelectedPath = normalizeTreePath(selectedPath);

    for (const path of model.model.getSelectedPaths()) {
      if (normalizeTreePath(path) !== normalizedSelectedPath) {
        model.model.getItem(path)?.deselect();
      }
    }

    if (!paths.includes(normalizedSelectedPath)) return;
    const item = model.model.getItem(normalizedSelectedPath);
    item?.select();
    item?.focus();
  }, [model.model, paths, selectedPath]);

  return (
    <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-fe-border bg-fe-card">
      <div className="flex items-center gap-1 border-b border-fe-border px-3 py-2.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-fe-border bg-fe-input px-2.5 text-fe-muted-foreground">
          <Search className="size-4 shrink-0" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search files"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-fe-foreground outline-none placeholder:text-fe-muted-foreground"
          />
        </div>
        <IconButton
          type="button"
          onClick={() => startCreate()}
          disabled={createFile.isPending}
          aria-label="Create file"
          title="Create file"
        >
          <Plus className="size-4" />
        </IconButton>
        <IconButton
          type="button"
          onClick={() => tree.refetch()}
          aria-label="Refresh files"
          title="Refresh"
        >
          <RefreshCw className="size-4" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-fe-background/40">
        {tree.isLoading ? (
          <div className="p-3 text-sm text-fe-muted-foreground">Loading files…</div>
        ) : tree.isError ? (
          <div className="p-3 text-sm text-fe-destructive">Could not load files.</div>
        ) : paths.length === 0 && draftParent === null ? (
          <div className="p-3 text-sm text-fe-muted-foreground">
            {searchQuery.trim() ? 'No matching files.' : 'No files yet.'}
          </div>
        ) : (
          <div className="flex size-full flex-col overflow-hidden">
            {draftParent !== null ? (
              <div className="border-b border-fe-border bg-fe-muted/35 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <FilePlus className="size-4 shrink-0 text-fe-muted-foreground" />
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitCreate();
                      if (event.key === 'Escape') cancelCreate();
                    }}
                    onBlur={() => {
                      if (!draftName.trim()) cancelCreate();
                    }}
                    placeholder={draftParent ? `${draftParent}/new-page.mdx` : 'docs/new-page.mdx'}
                    className="h-8 border-transparent bg-transparent px-1 focus:border-fe-ring"
                  />
                </div>
                <p className="mt-1 pl-6 text-[11px] text-fe-muted-foreground">
                  Press Enter to create. Nested paths like <code>a/b/c.mdx</code> are supported.
                </p>
              </div>
            ) : null}

            {paths.length === 0 ? (
              <div className="p-3 text-sm text-fe-muted-foreground">
                {searchQuery.trim() ? 'No matching files.' : 'No files yet.'}
              </div>
            ) : (
              <FileTree
                model={model.model}
                className="block min-h-0 flex-1 overflow-hidden"
                renderContextMenu={(item, context) => (
                  <MenuContent data-file-tree-context-menu-root="true">
                    <MenuItem
                      onClick={() => {
                        context.close();
                        startCreate(
                          item.kind === 'directory'
                            ? normalizeTreePath(item.path)
                            : parentPath(item.path),
                        );
                      }}
                    >
                      <FilePlus className="size-4" />
                      New file
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        context.close();
                        model.model.startRenaming(item.path);
                      }}
                    >
                      <Pencil className="size-4" />
                      Rename
                    </MenuItem>
                    <MenuItem
                      className="text-fe-destructive hover:bg-fe-destructive/10"
                      onClick={() => {
                        context.close();
                        deletePath.mutate({
                          path: normalizeTreePath(item.path),
                          recursive: item.kind === 'directory',
                        });
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </MenuItem>
                  </MenuContent>
                )}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
