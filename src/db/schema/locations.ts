import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  isMain: integer('is_main').default(0), // 1 for main location, 0 for others
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;