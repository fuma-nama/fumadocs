import { defineType, defineField } from 'sanity';

export const blockContent = defineType({
  title: 'Content',
  name: 'blockContent',
  type: 'array',
  of: [
    { type: 'block' },
    {
      type: 'code',
    },
    { type: 'image' },
    {
      type: 'cards',
    },
    {
      type: 'callout',
    },
    // other types...
  ],
});

export const docsType = defineType({
  name: 'docs',
  title: 'Documentation',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
});

export const callout = defineType({
  name: 'callout',
  type: 'object',
  title: 'Callout',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'blockContent',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
    defineField({
      name: 'type',
      type: 'string',
      options: {
        list: [
          { title: 'Info', value: 'info' },
          { title: 'Success', value: 'success' },
          { title: 'Warning', value: 'warning' },
          { title: 'Error', value: 'error' },
          { title: 'Idea', value: 'idea' },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'body',
    },
  },
});

export const card = defineType({
  name: 'card',
  type: 'object',
  title: 'Card',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'blockContent',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
    defineField({
      name: 'url',
      type: 'string',
      title: 'Link To',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'body',
    },
  },
});

export const cards = defineType({
  name: 'cards',
  type: 'object',
  description: 'The container of cards',
  title: 'Cards',
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{ type: 'card' }],
    }),
  ],
  preview: {
    select: {
      items: 'items',
    },
    prepare({ items = [] }) {
      return {
        title: `${items.length} Cards`,
      };
    },
  },
});
