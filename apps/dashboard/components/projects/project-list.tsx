'use client';

import { ArrowRight, FolderPlus, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateProjectMutation, useProjectsQuery, useSessionQuery } from '@/lib/editor/queries';

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function ProjectList() {
  const session = useSessionQuery();
  const projects = useProjectsQuery();
  const createProject = useCreateProjectMutation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [manualSlug, setManualSlug] = useState(false);
  const derivedSlug = useMemo(() => slugify(name), [name]);
  const effectiveSlug = manualSlug ? slug : derivedSlug;

  function updateName(value: string) {
    setName(value);
    if (!manualSlug) setSlug(slugify(value));
  }

  function submitProject() {
    createProject.mutate(
      {
        name,
        slug: effectiveSlug,
      },
      {
        onSuccess() {
          setName('');
          setSlug('');
          setManualSlug(false);
        },
      },
    );
  }

  if (session.isLoading || projects.isLoading) {
    return (
      <ProjectListShell>
        <Loader2 className="mx-auto size-5 animate-spin text-fe-muted-foreground" />
        <p className="mt-3 text-center">Loading projects…</p>
      </ProjectListShell>
    );
  }

  if (session.data?.session === null) {
    return (
      <ProjectListShell>
        <Link className="font-medium underline" href="/sign-in">
          Sign in
        </Link>{' '}
        to view your projects.
      </ProjectListShell>
    );
  }

  if (projects.isError) {
    return <ProjectListShell>Could not load projects.</ProjectListShell>;
  }

  const list = projects.data?.projects ?? [];

  return (
    <main className="min-h-screen bg-fe-background text-fe-foreground">
      <div className="border-b border-fe-border bg-fe-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-sm font-medium text-fe-muted-foreground">Fumadocs Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Projects</h1>
          </div>
          <div className="rounded-full border border-fe-border bg-fe-muted px-3 py-1 text-xs text-fe-muted-foreground">
            {list.length} {list.length === 1 ? 'project' : 'projects'}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-fe-border bg-fe-card p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.45fr] lg:items-start">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-fe-primary text-fe-primary-foreground">
                <FolderPlus className="size-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Create project</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-fe-muted-foreground">
                Start with a docs workspace, owner membership, S3 storage prefix, and a starter MDX page.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr_auto] sm:items-end">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fe-muted-foreground">Project name</span>
                <Input value={name} onChange={(event) => updateName(event.target.value)} placeholder="Acme Docs" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fe-muted-foreground">Slug</span>
                <Input
                  value={effectiveSlug}
                  onChange={(event) => {
                    setManualSlug(true);
                    setSlug(slugify(event.target.value));
                  }}
                  placeholder="acme-docs"
                />
              </label>

              <Button
                className="w-full sm:w-auto"
                variant="primary"
                disabled={createProject.isPending || name.trim().length < 2 || effectiveSlug.length < 2}
                onClick={submitProject}
              >
                {createProject.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Create
              </Button>
            </div>
          </div>

          {createProject.isError ? (
            <p className="mt-4 rounded-lg border border-fe-destructive/30 bg-fe-destructive/10 px-3 py-2 text-sm text-fe-destructive">
              {createProject.error.message}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-fe-muted-foreground">Your projects</h2>
          </div>

          {list.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-fe-border bg-fe-card p-8 text-center shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-fe-muted text-fe-muted-foreground">
                <FolderPlus className="size-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
              <p className="mt-2 max-w-sm text-sm text-fe-muted-foreground">
                Create your first project to open the editor and start writing MDX content.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {list.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/editor`}
                  className="group rounded-2xl border border-fe-border bg-fe-card p-5 shadow-sm transition hover:border-fe-ring hover:bg-fe-accent/20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-semibold">{project.name}</h2>
                        <span className="rounded-full bg-fe-muted px-2 py-0.5 text-xs text-fe-muted-foreground">
                          {project.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-fe-muted-foreground">{project.slug}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-fe-muted-foreground transition group-hover:translate-x-1 group-hover:text-fe-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProjectListShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fe-background p-6 text-fe-muted-foreground">
      <div className="w-full max-w-md rounded-xl border border-fe-border bg-fe-card p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
