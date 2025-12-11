import { pgTable, serial, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('free').notNull(),
  settings: text('settings'), // JSON string for flexible settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;