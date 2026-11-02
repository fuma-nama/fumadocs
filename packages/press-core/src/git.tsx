import { existsSync } from 'node:fs';
import path from 'node:path';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { Context, SiteConfig } from './context';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

type GitInfo = NonNullable<Context['siteConfig']['git']>;

const instances: Record<GitProvider, string> = {
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
  bitbucket: 'https://bitbucket.org',
};

/** brand icons from Simple Icons (https://simpleicons.org, CC0-1.0), Fumadocs UI has the one of GitHub */
const icons: Record<Exclude<GitProvider, 'github'>, { label: string; icon: string }> = {
  gitlab: {
    label: 'GitLab',
    icon: 'm23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3361.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.4617 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4616-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0099-7.003z',
  },
  bitbucket: {
    label: 'Bitbucket',
    icon: 'M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z',
  },
};

/** `site.git` with the defaults: GitHub, the official instance, the closest directory with `.git` */
export function resolveGit(git: NonNullable<SiteConfig['git']>): GitInfo {
  const provider = git.provider ?? 'github';

  return {
    ...git,
    provider,
    url: (git.url ?? instances[provider]).replace(/\/$/, ''),
    rootDir: git.rootDir ?? findRootDir(),
  };
}

function findRootDir(): string {
  let dir = process.cwd();
  while (!existsSync(path.join(dir, '.git'))) {
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return dir;
}

function getRepoUrl(git: GitInfo): string {
  return `${git.url}/${git.user}/${git.repo}`;
}

/** the URL of a file on the git provider, `undefined` for files outside the repository */
export function getFileUrl(git: GitInfo, absolutePath: string): string | undefined {
  const file = path.relative(git.rootDir, absolutePath).replaceAll(path.sep, '/');
  if (file.startsWith('../') || path.isAbsolute(file)) return;
  const repo = getRepoUrl(git);

  switch (git.provider) {
    case 'gitlab':
      return `${repo}/-/blob/${git.branch}/${file}`;
    case 'bitbucket':
      return `${repo}/src/${git.branch}/${file}`;
    default:
      return `${repo}/blob/${git.branch}/${file}`;
  }
}

/** link the repository in layout props, unless they have `githubUrl` */
export function addRepoLink(
  props: Omit<BaseLayoutProps, 'children'>,
  git: GitInfo,
): Omit<BaseLayoutProps, 'children'> {
  if (props.githubUrl) return props;
  const url = getRepoUrl(git);
  // Fumadocs UI renders `githubUrl` as a GitHub icon link, other providers need a link item
  if (git.provider === 'github') return { ...props, githubUrl: url };
  const { label, icon } = icons[git.provider];

  return {
    ...props,
    links: [
      ...(props.links ?? []),
      {
        type: 'icon',
        url,
        text: label,
        label,
        icon: (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d={icon} />
          </svg>
        ),
        external: true,
      },
    ],
  };
}
