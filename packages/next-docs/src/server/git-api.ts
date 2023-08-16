/**
 * @param repo The repository, example: "fuma/next-docs"
 * @param path the path to file
 */
export async function getGitLastEditTime(
  repo: string,
  path: string,
  customParams: Record<string, string> = {},
  init: RequestInit = {}
): Promise<Date | null> {
  const params = new URLSearchParams()
  params.set('path', path)
  params.set('page', '1')
  params.set('per_page', '1')

  for (const [key, value] of Object.entries(customParams)) {
    params.set(key, value)
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?${params}`,
    init
  )

  if (!res.ok) throw new Error('Failed to fetch last edit time from Git')
  const data = await res.json()

  if (!data[0]) return null
  return new Date(data[0].commit.committer.date)
}
