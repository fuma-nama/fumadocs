import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

/*
Initialize a Git repo on the project.

Based on https://github.com/vercel/next.js/blob/canary/packages/create-next-app/helpers/git.ts
*/

function isInGitRepository(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore', cwd });
    return true;
  } catch (_) {
    return false;
  }
}

function isInMercurialRepository(cwd: string): boolean {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore', cwd });
    return true;
  } catch (_) {
    return false;
  }
}

function isDefaultBranchSet(cwd: string): boolean {
  try {
    execSync('git config init.defaultBranch', { stdio: 'ignore', cwd });
    return true;
  } catch (_) {
    return false;
  }
}

export function tryGitInit(root: string): boolean {
  let didInit = false;

  try {
    execSync('git --version', { stdio: 'ignore' });
    if (isInGitRepository(root) || isInMercurialRepository(root)) {
      return false;
    }

    execSync('git init', { stdio: 'ignore', cwd: root });
    didInit = true;

    if (!isDefaultBranchSet(root)) {
      execSync('git checkout -b main', { stdio: 'ignore', cwd: root });
    }

    execSync('git add -A', { stdio: 'ignore', cwd: root });
    execSync('git commit -m "Initial commit from Create Fumadocs App"', {
      stdio: 'ignore',
      cwd: root,
    });
    return true;
  } catch (e) {
    if (didInit) {
      try {
        rmSync(join(root, '.git'), { recursive: true, force: true });
      } catch (_) {
        // do nothing
      }
    }

    return false;
  }
}
