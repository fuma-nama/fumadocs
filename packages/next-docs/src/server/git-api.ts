type Response = {
  commit: {
    committer: {
      date: string
    }
  }
}[]

/**
 * @param repo The repository, example: "fuma/next-docs"
 * @param path the path to file
 * @deprecated use `getGithubLastEdit` instead
 */
export async function getGitLastEditTime(
  repo: string,
  path: string,
  customParams: Record<string, string> = {},
  init: RequestInit = {}
): Promise<Date | null> {
  return getGithubLastEdit({
    repo: repo.split('/')[1],
    owner: repo.split('/')[0],
    path,
    options: init,
    params: customParams
  })
}

export type GetGithubLastCommitOptions = {
  /**
   * Repository name, like "next-docs"
   */
  repo: string

  /** Owner of repository */
  owner: string

  /**
   * Path to file
   */
  path: string

  /**
   * Github access token
   */
  token?: string

  /**
   * Custom query parameters
   */
  params?: Record<string, string>

  options?: RequestInit
}

/**
 * Get the last edit time of a file
 */
export async function getGithubLastEdit({
  repo,
  token,
  owner,
  path,
  options = {},
  params: customParams = {}
}: GetGithubLastCommitOptions): Promise<Date | null> {
  const params = new URLSearchParams()
  params.set('path', path)
  params.set('page', '1')
  params.set('per_page', '1')

  for (const [key, value] of Object.entries(customParams)) {
    params.set(key, value)
  }

  if (token) {
    options.headers = new Headers(options.headers)
    options.headers.append('authorization', token)
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?${params}`,
    options
  )

  if (!res.ok)
    throw new Error(
      'Failed to fetch last edit time from Git ' + (await res.text())
    )
  const data: Response = await res.json()

  if (data.length === 0) return null
  return new Date(data[0].commit.committer.date)
}
