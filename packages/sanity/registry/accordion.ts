import { defineType, defineField } from 'sanity';

export const accordion = defineType({
  name: 'accordion',
  type: 'object',
  title: 'Accordion',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'blockContent',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'id',
      title: 'Anchor ID',
      type: 'string',
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
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

export const accordions = defineType({
  name: 'accordions',
  type: 'object',
  title: 'Accordions',
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      initialValue: 'single',
      options: {
        list: [
          { title: 'Single', value: 'single' },
          { title: 'Multiple', value: 'multiple' },
        ],
      },
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{ type: 'accordion' }],
    }),
  ],
  preview: {
    select: {
      type: 'type',
    },
    prepare({ type }) {
      return {
        title: 'Accordions',
        subtitle: type,
      };
    },
  },
});
