import { defineType, defineField } from 'sanity';

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

export const cards = defineType({
  name: 'cards',
  type: 'object',
  description: 'The container of cards',
  title: 'Cards',
  fields: [
    defineField({
      name: 'children',
      title: 'Children',
      type: 'blockContent',
    }),
  ],
});
