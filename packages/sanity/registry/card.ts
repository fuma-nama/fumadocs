import { defineType, defineField } from 'sanity';

export const card = defineType({
  name: 'card',
  type: 'object',
  title: 'Card',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'children',
      title: 'Children',
      type: 'blockContent',
    }),
    defineField({
      name: 'url',
      type: 'string',
      title: 'card href',
    }),
  ],
});
