const owner = 'fuma-nama';
const repo = 'fumadocs';
const versionPattern = /^16\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

type GitRefResponse = {
  object: {
    type: 'commit' | 'tag';
    sha: string;
  };
};

type GitTagResponse = {
  object: {
    sha: string;
  };
};

type VercelDeployment = {
  uid: string;
  url: string;
  alias?: string[];
  createdAt: number;
  target?: string;
};

type VercelDeploymentsResponse = {
  deployments?: VercelDeployment[];
};

export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const version = url.searchParams.get('version');

  if (!version) {
    return Response.json(
      {
        error: 'Missing query parameter: version',
        expected: '16.x.x',
      },
      { status: 400 },
    );
  }

  if (!versionPattern.test(version)) {
    return Response.json(
      {
        error: 'Only fumadocs-ui versions around 16.x.x are supported',
        received: version,
      },
      { status: 400 },
    );
  }

  const tag = `fumadocs-ui@${version}`;

  try {
    const commitSha = await resolveTagCommitSha(tag);

    if (!commitSha) {
      return Response.json(
        {
          error: 'Tag not found on GitHub',
          tag,
        },
        { status: 404 },
      );
    }

    const deployment = await findProductionDeployment(commitSha);

    if (!deployment) {
      return Response.json(
        {
          error: 'No production deployment found for this tag commit',
          version,
          tag,
          commitSha,
        },
        { status: 404 },
      );
    }

    const deploymentUrl = deployment.alias?.[0] ?? `https://${deployment.url}`;

    return Response.json({
      version,
      tag,
      commitSha,
      deploymentUrl,
      deployment: {
        id: deployment.uid,
        createdAt: deployment.createdAt,
        target: deployment.target ?? 'production',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        error: 'Failed to resolve deployment URL',
        details: message,
      },
      { status: 502 },
    );
  }
}

async function resolveTagCommitSha(tag: string): Promise<string | null> {
  const ref = await githubRequest<GitRefResponse>(`/git/ref/tags/${encodeURIComponent(tag)}`, {
    allowNotFound: true,
  });

  if (!ref) return null;

  if (ref.object.type === 'commit') {
    return ref.object.sha;
  }

  const annotatedTag = await githubRequest<GitTagResponse>(`/git/tags/${ref.object.sha}`);
  return annotatedTag.object.sha;
}

async function githubRequest<T>(
  path: string,
  options?: { allowNotFound?: boolean },
): Promise<T | null> {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'User-Agent': 'fumadocs-docs-route',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    headers,
    cache: 'no-store',
  });

  if (response.status === 404 && options?.allowNotFound) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function findProductionDeployment(commitSha: string): Promise<VercelDeployment | null> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID environment variable');
  }

  const url = new URL('https://api.vercel.com/v6/deployments');
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('target', 'production');
  url.searchParams.set('limit', '1');
  url.searchParams.set('meta-githubCommitSha', commitSha);

  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vercel API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as VercelDeploymentsResponse;
  return data.deployments?.[0] ?? null;
}
