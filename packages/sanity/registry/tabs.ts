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
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'body',
    },
  },
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
  preview: {
    select: {
      items: 'items',
    },
    prepare({ items = [] }) {
      return {
        title: `${items.length} Tabs`,
      };
    },
  },
});
