import { App } from 'octokit';
import type { Feedback } from '@/components/rate';

export const repo = 'fumadocs';
export const owner = 'fuma-nama';
export const DocsCategory = 'Docs Feedback';

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
});

const { data } = await app.octokit.request(
  'GET /repos/{owner}/{repo}/installation',
  {
    owner,
    repo,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
);

const octokit = await app.getInstallationOctokit(data.id);

const {
  repository,
}: {
  repository: {
    id: string;
    discussionCategories: {
      nodes: {
        id: string;
        name: string;
      }[];
    };
  };
} = await octokit.graphql(`
  query {
    repository(owner: "${owner}", name: "${repo}") {
      id
      discussionCategories(first: 25) {
        nodes { id name }
      }
    }
  }
`);

const category = repository.discussionCategories.nodes.find(
  (category) => category.name === DocsCategory,
);

if (!category)
  throw new Error(
    `No appropriate category on GitHub Discussion, needed: "${DocsCategory}"`,
  );

export async function onRateAction(url: string, feedback: Feedback) {
  'use server';

  const title = `Feedback for ${url}`;
  const body = `**Forwarded from user feedback**\n\n**Opinion:** ${feedback.opinion}\n**Message:** ${feedback.message}`;

  const {
    search: { nodes: discussions },
  }: {
    search: {
      nodes: { id: string }[];
    };
  } = await octokit.graphql(`
          query {
            search(type: DISCUSSION, query: ${JSON.stringify(`${title} in:title repo:fuma-nama/fumadocs author:@me`)}, first: 1) {
              nodes {
                ... on Discussion { id }
              }
            }
          }`);

  if (discussions.length > 0) {
    await octokit.graphql(`
            mutation {
              addDiscussionComment(input: { body: ${JSON.stringify(body)}, discussionId: "${discussions[0].id}" }) {
                comment { id }
              }
            }`);
  } else {
    await octokit.graphql(`
            mutation {
              createDiscussion(input: { repositoryId: "${repository.id}", categoryId: "${category!.id}", body: ${JSON.stringify(body)}, title: ${JSON.stringify(title)} }) {
                discussion { id }
              }
            }`);
  }
}
