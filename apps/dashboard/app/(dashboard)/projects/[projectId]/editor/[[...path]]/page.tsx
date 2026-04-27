import { ProjectEditorShell } from '@/components/editor/project-editor-shell';

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[] }>;
}) {
  const { projectId, path } = await params;

  return <ProjectEditorShell projectId={projectId} path={path?.join('/') ?? 'index.mdx'} />;
}
