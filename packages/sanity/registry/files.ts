import { defineType, defineField } from 'sanity';

const fileTreeItems = [{ type: 'file' }, { type: 'folder' }];

export const file = defineType({
  name: 'file',
  type: 'object',
  title: 'File',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: {
      title: 'name',
    },
  },
});

export const folder = defineType({
  name: 'folder',
  type: 'object',
  title: 'Folder',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'defaultOpen',
      title: 'Open by default',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: fileTreeItems,
    }),
  ],
  preview: {
    select: {
      title: 'name',
    },
  },
});

export const files = defineType({
  name: 'files',
  type: 'object',
  title: 'Files',
  fields: [
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: fileTreeItems,
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'File Tree',
      };
    },
  },
});
