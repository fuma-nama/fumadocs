import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const project = pgTable(
  'project',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('project_owner_id_idx').on(table.ownerId)],
);

export const projectMember = pgTable(
  'project_member',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'editor', 'viewer'] })
      .notNull()
      .default('viewer'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })],
);

export const projectStorage = pgTable('project_storage', {
  projectId: text('project_id')
    .primaryKey()
    .references(() => project.id, { onDelete: 'cascade' }),
  bucket: text('bucket').notNull(),
  prefix: text('prefix').notNull(),
  defaultWorkspace: text('default_workspace').notNull().default('main'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documentState = pgTable(
  'document_state',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    yjsStateKey: text('yjs_state_key'),
    canonicalContentKey: text('canonical_content_key').notNull(),
    version: integer('version').notNull().default(1),
    updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('document_state_project_key_idx').on(table.projectId, table.objectKey),
    index('document_state_project_idx').on(table.projectId),
  ],
);

export const asset = pgTable(
  'asset',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    manifestPath: text('manifest_path'),
    storageKey: text('storage_key').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size'),
    checksum: text('checksum'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('asset_project_id_idx').on(table.projectId)],
);

export const projectRelations = relations(project, ({ one, many }) => ({
  owner: one(user, { fields: [project.ownerId], references: [user.id] }),
  members: many(projectMember),
  storage: one(projectStorage),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, { fields: [projectMember.projectId], references: [project.id] }),
  user: one(user, { fields: [projectMember.userId], references: [user.id] }),
}));
