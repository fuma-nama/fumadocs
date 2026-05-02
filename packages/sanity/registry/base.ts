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
      type: 'card',
    },
    {
      type: 'callout',
    },
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
