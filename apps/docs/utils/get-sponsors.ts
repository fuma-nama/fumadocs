interface SponsorEntity {
  __typename: 'User' | 'Organization';
  login: string;
  name: string;
  avatarUrl: string;
  websiteUrl?: string;
}

export async function getSponsors(
  login: string,
  excluded: string[],
): Promise<SponsorEntity[]> {
  const query = `query {
  user(login:${JSON.stringify(login)}) {
    ... on Sponsorable {
      sponsors(first: 100) {
        nodes {
          __typename
          ... on User { login, name, avatarUrl, websiteUrl }
          ... on Organization { login, name, avatarUrl, websiteUrl }
        }
      }
    }
  }
}`;
  const headers = new Headers();
  if (process.env.GITHUB_TOKEN)
    headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);
  else
    console.warn(
      'Highly suggested to add a `GITHUB_TOKEN` environment variable to avoid rate limits.',
    );

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers,
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed to fetch sponsors: ${await res.text()}`);

  const { data } = (await res.json()) as {
    data: {
      user: {
        sponsors: {
          nodes: (SponsorEntity | Record<string, never>)[];
        };
      };
    };
  };

  return data.user.sponsors.nodes.filter(
    (sponsor) => 'name' in sponsor && !excluded.includes(sponsor.login),
  ) as SponsorEntity[];
}
