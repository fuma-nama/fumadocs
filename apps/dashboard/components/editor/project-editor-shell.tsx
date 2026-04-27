'use client';

import { ArrowLeft, Check, ChevronDown, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FileTreePanel } from '@/components/editor/file-tree-panel';
import { ProjectDocumentEditor } from '@/components/editor/project-document-editor';
import { buttonVariants } from '@/components/ui/button';
import {
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProjectQuery, useProjectsQuery, useSessionQuery } from '@/lib/editor/queries';
import { cn } from '@/lib/cn';

function encodeEditorPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function ProjectEditorShell({ projectId, path }: { projectId: string; path: string }) {
  const router = useRouter();
  const session = useSessionQuery();
  const project = useProjectQuery(projectId);
  const projects = useProjectsQuery();

  if (session.isLoading || project.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">Loading dashboard…</main>
    );
  }

  if (session.data?.session === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fe-background p-6">
        <div className="max-w-md rounded-lg border border-fe-border bg-fe-card p-6 text-sm text-fe-muted-foreground">
          Sign in through the Better Auth endpoints before opening a project.
        </div>
      </main>
    );
  }

  if (project.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fe-background p-6">
        <div className="max-w-md rounded-lg border border-fe-border bg-fe-card p-6 text-sm text-fe-destructive">
          Could not load this project.
        </div>
      </main>
    );
  }

  const projectName = project.data?.project?.name ?? 'Project';
  const projectSlug = project.data?.project?.slug;
  const projectList = projects.data?.projects ?? [];

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-fe-background text-fe-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-fe-border bg-fe-card px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/projects"
            className={buttonVariants({
              className: 'h-8 gap-1.5 px-2 text-xs',
            })}
          >
            <ArrowLeft className="size-3.5" />
            Home
          </Link>

          <div className="hidden h-6 w-px bg-fe-border sm:block" />

          <PopoverRoot>
            <PopoverTrigger
              className="group flex h-10 min-w-0 max-w-72 items-center gap-2.5 rounded-xl border border-transparent bg-transparent px-2 text-left transition hover:border-fe-border hover:bg-fe-muted/55 focus-visible:border-fe-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 data-popup-open:border-fe-border data-popup-open:bg-fe-muted/55"
              disabled={projects.isLoading || projectList.length === 0}
              aria-label="Switch project"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-fe-muted text-fe-muted-foreground transition group-hover:bg-fe-card group-data-popup-open:bg-fe-card">
                <FolderKanban className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{projectName}</span>
                {projectSlug ? (
                  <span className="block truncate text-xs text-fe-muted-foreground">
                    {projectSlug}
                  </span>
                ) : null}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-fe-muted-foreground transition group-data-popup-open:rotate-180" />
            </PopoverTrigger>

            <PopoverPortal>
              <PopoverPositioner sideOffset={8} align="start">
                <PopoverContent size="sm" className="w-80 p-2">
                  <div className="px-2 py-2">
                    <div className="text-sm font-semibold text-fe-popover-foreground">
                      Switch project
                    </div>
                    <div className="mt-0.5 text-xs text-fe-muted-foreground">
                      {projectList.length} {projectList.length === 1 ? 'project' : 'projects'} available
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto p-1">
                    {projectList.map((item) => {
                      const selected = item.id === projectId;

                      return (
                        <PopoverClose
                          key={item.id}
                          onClick={() => {
                            if (!selected) router.push(`/projects/${item.id}/editor`);
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition hover:bg-fe-muted focus-visible:bg-fe-muted',
                            selected && 'bg-fe-accent text-fe-accent-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-lg border border-fe-border bg-fe-card text-fe-muted-foreground',
                              selected && 'border-fe-accent-foreground/20 bg-fe-accent-foreground/15 text-fe-accent-foreground',
                            )}
                          >
                            <FolderKanban className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span
                              className={cn(
                                'mt-0.5 block truncate text-xs text-fe-muted-foreground',
                                selected && 'text-fe-accent-foreground/75',
                              )}
                            >
                              {item.slug} · {item.role}
                            </span>
                          </span>
                          {selected ? <Check className="size-4 shrink-0" /> : null}
                        </PopoverClose>
                      );
                    })}
                  </div>
                </PopoverContent>
              </PopoverPositioner>
            </PopoverPortal>
          </PopoverRoot>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileTreePanel
          projectId={projectId}
          selectedPath={path}
          onSelectFile={(nextPath) => {
            router.push(`/projects/${projectId}/editor/${encodeEditorPath(nextPath)}`);
          }}
        />
        <ProjectDocumentEditor projectId={projectId} path={path} />
      </div>
    </main>
  );
}
