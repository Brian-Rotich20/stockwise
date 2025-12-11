import { pgTable, serial, varchar, decimal, integer, timestamp, text, index, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { suppliers } from './suppliers';
import { users } from './users';

export const orderTypeEnum = pgEnum('order_type', ['SALE', 'PURCHASE']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  type: orderTypeEnum('type').notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  
  // Totals
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  
  // Relationships
  supplierId: integer('supplier_id').references(() => suppliers.id), // For purchase orders
  customerId: integer('customer_id'), // Can add customers table later
  userId: integer('user_id').references(() => users.id).notNull(), // Who created the order
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  
  // Additional info
  notes: text('notes'),
  
  // Timestamps
  orderDate: timestamp('order_date').defaultNow().notNull(),
  deliveryDate: timestamp('delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_orders_tenant').on(table.tenantId),
  dateIdx: index('idx_orders_date').on(table.orderDate),
  statusIdx: index('idx_orders_status').on(table.status),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;