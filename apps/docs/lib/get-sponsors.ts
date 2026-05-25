import { Octokit } from 'octokit';

export interface Sponsor extends SponsorEntity {
  tier: Tier;
  isActive: boolean;
  isOneTimePayment: boolean;
}

interface SponsorEntity {
  __typename: 'User' | 'Organization';
  login: string;
  avatarUrl: string;
  websiteUrl: string;
  name: string;
}

interface Tier {
  monthlyPriceInDollars: number;
  name?: string;
}

export const revalidate = 60 * 30;

export async function getSponsors(owner: string): Promise<Sponsor[]> {
  if (!process.env.GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN environment variable is required for fetching sponsors.');
    return [];
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    const response = await octokit.graphql<{
      user: {
        sponsorshipsAsMaintainer: {
          nodes: Array<{
            isActive: boolean;
            isOneTimePayment: boolean;
            sponsorEntity: SponsorEntity;
            tier: Tier;
          }>;
        };
      };
    }>(`
      query {
        user(login: ${JSON.stringify(owner)}) {
          sponsorshipsAsMaintainer(first: 100, activeOnly: false) {
            nodes {
              isActive
              isOneTimePayment
              sponsorEntity {
                __typename
                ... on User {
                    login
                    avatarUrl
                    name
                    websiteUrl
                }
                ... on Organization {
                    login
                    avatarUrl
                    websiteUrl
                    name
                }
              }
              tier {
                monthlyPriceInDollars
                name
              }
            }
          }
        }
      }
    `);

    const sponsors = response.user.sponsorshipsAsMaintainer.nodes.map(
      (node): Sponsor => ({
        ...node.sponsorEntity,
        isActive: node.isActive,
        isOneTimePayment: node.isOneTimePayment,
        name: node.sponsorEntity.name || node.sponsorEntity.login,
        tier: node.tier,
      }),
    );

    return sponsors.sort(
      (a, b) =>
        b.tier.monthlyPriceInDollars * (b.isOneTimePayment ? 1 : 2) -
        a.tier.monthlyPriceInDollars * (a.isOneTimePayment ? 1 : 2),
    );
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    throw error;
  }
}
