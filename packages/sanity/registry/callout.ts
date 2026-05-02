import { defineType, defineField } from 'sanity';

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
      name: 'children',
      title: 'Children',
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
});
