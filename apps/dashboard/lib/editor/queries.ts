'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

export type TreeEntry = {
  kind: 'folder' | 'file';
  name: string;
  path: string;
  key?: string;
  size?: number;
  updatedAt?: string | null;
};

export type TreeResponse = {
  prefix: string;
  path: string;
  entries: TreeEntry[];
};

export type DocumentResponse = {
  path: string;
  key: string;
  content: string;
  exists: boolean;
};

export type ProjectListItem = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  role: 'owner' | 'editor' | 'viewer';
  updatedAt: string;
};

export type ProjectResponse = {
  project: {
    id: string;
    slug: string;
    name: string;
    ownerId: string;
  };
  role: ProjectListItem['role'];
  storage: {
    prefix: string;
    defaultWorkspace: string;
  };
};

export function useSessionQuery() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => apiFetch<{ session: unknown | null }>('/api/session'),
  });
}

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<ProjectResponse>(`/api/projects/${projectId}`),
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<{ projects: ProjectListItem[] }>('/api/projects'),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      apiFetch<{ project: ProjectListItem }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectTreeQuery(projectId: string) {
  return useQuery({
    queryKey: ['project-tree', projectId],
    queryFn: () =>
      apiFetch<TreeResponse>(
        `/api/projects/${projectId}/tree?recursive=true`,
      ),
  });
}

export function useDocumentQuery(projectId: string, path: string) {
  return useQuery({
    queryKey: ['document', projectId, path],
    queryFn: () =>
      apiFetch<DocumentResponse>(
        `/api/projects/${projectId}/content?path=${encodeURIComponent(path)}`,
      ),
  });
}

export function useSaveDocumentMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { path: string; content: string }) =>
      apiFetch<{ path: string; key: string }>(`/api/projects/${projectId}/content`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['document', projectId, variables.path] });
      void queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
    },
  });
}

export function useCreateFileMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { path: string; content?: string }) =>
      apiFetch(`/api/projects/${projectId}/tree`, {
        method: 'POST',
        body: JSON.stringify({ action: 'createFile', content: '', ...input }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
    },
  });
}

export function useMovePathMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { from: string; to: string; recursive?: boolean }) =>
      apiFetch(`/api/projects/${projectId}/tree`, {
        method: 'POST',
        body: JSON.stringify({ action: 'move', recursive: false, ...input }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
    },
  });
}

export function useDeletePathMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { path: string; recursive?: boolean }) =>
      apiFetch(`/api/projects/${projectId}/tree`, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', recursive: false, ...input }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tree', projectId] });
    },
  });
}

export function useUploadAssetMutation(projectId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const presigned = await apiFetch<{
        assetId: string;
        key: string;
        uploadUrl: string;
        publicUrl: string;
      }>(`/api/projects/${projectId}/assets/presign`, {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      const upload = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!upload.ok) {
        throw new Error(await upload.text());
      }

      await apiFetch(`/api/projects/${projectId}/assets`, {
        method: 'POST',
        body: JSON.stringify({
          id: presigned.assetId,
          key: presigned.key,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });

      return presigned.publicUrl;
    },
  });
}
