import { defineType, defineField } from 'sanity';

export const tab = defineType({
  name: 'tab',
  type: 'object',
  title: 'Tab',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'children',
      title: 'Children',
      type: 'blockContent',
    }),
  ],
});

export const tabs = defineType({
  name: 'tabs',
  type: 'object',
  title: 'Tabs',
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{ type: 'tab' }],
    }),
  ],
});
