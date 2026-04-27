'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === 'sign-up';

  async function submit() {
    setPending(true);
    setError(null);

    const result = isSignUp
      ? await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: '/projects',
        })
      : await authClient.signIn.email({
          email,
          password,
          callbackURL: '/projects',
        });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? 'Authentication failed');
      return;
    }

    router.push('/projects');
    router.refresh();
  }

  async function signInWithGitHub() {
    setPending(true);
    setError(null);

    const result = await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/projects',
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? 'GitHub sign-in failed');
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fe-background p-6 text-fe-foreground">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,var(--color-fe-primary)_0%,transparent_58%)] opacity-20"
        aria-hidden
      />
      <div className="w-full max-w-md rounded-2xl border border-fe-border bg-fe-card/95 p-7 shadow-xl shadow-black/5 backdrop-blur">
        <div className="mb-7">
          <div className="inline-flex rounded-full border border-fe-border bg-fe-muted px-3 py-1 text-xs font-medium text-fe-muted-foreground">
            Fumadocs Dashboard
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {isSignUp ? 'Create your workspace' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-fe-muted-foreground">
            {isSignUp
              ? 'Start a dashboard account for editing and publishing docs.'
              : 'Sign in to manage projects and continue editing.'}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {isSignUp ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-fe-muted-foreground">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-fe-muted-foreground">Email</span>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              type="email"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-fe-muted-foreground">Password</span>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              type="password"
            />
          </label>

          {error ? <p className="text-sm text-fe-destructive">{error}</p> : null}

          <Button className="w-full py-2.5" variant="primary" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
            {isSignUp ? 'Sign up' : 'Sign in'}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="h-px w-full bg-fe-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-fe-card px-2 text-xs text-fe-muted-foreground">or</span>
            </div>
          </div>

          <Button className="w-full py-2.5" disabled={pending} onClick={() => void signInWithGitHub()}>
            <span className="mr-2 flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">
              GH
            </span>
            Continue with GitHub
          </Button>
        </div>

        <p className="mt-5 text-center text-sm text-fe-muted-foreground">
          {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
          <Link className="font-medium text-fe-foreground underline" href={isSignUp ? '/sign-in' : '/sign-up'}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </main>
  );
}
