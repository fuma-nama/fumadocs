import {
  MarbleAuthorList,
  MarbleCategoryList,
  MarblePost,
  MarblePostList,
  MarbleTagList,
} from './types';

const url = process.env.MARBLE_API_URL;
const key = process.env.MARBLE_WORKSPACE_KEY;

export async function getPosts() {
  const raw = await fetch(`${url}/${key}/posts`);
  const data: MarblePostList = await raw.json();
  return data;
}

export async function getTags() {
  const raw = await fetch(`${url}/${key}/tags`);
  const data: MarbleTagList = await raw.json();
  return data;
}

export async function getSinglePost(slug: string) {
  const raw = await fetch(`${url}/${key}/posts/${slug}`);
  const data: MarblePost = await raw.json();
  return data;
}

export async function getCategories() {
  const raw = await fetch(`${url}/${key}/categories`);
  const data: MarbleCategoryList = await raw.json();
  return data;
}

export async function getAuthors() {
  const raw = await fetch(`${url}/${key}/authors`);
  const data: MarbleAuthorList = await raw.json();
  return data;
}
