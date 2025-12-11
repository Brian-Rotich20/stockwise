import { pgTable, serial, varchar, text, decimal, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { categories } from './categories';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  
  // Stock
  quantity: integer('quantity').default(0).notNull(),
  reorderPoint: integer('reorder_point').default(10).notNull(),
  
  // Metadata
  barcode: varchar('barcode', { length: 100 }),
  imageUrl: varchar('image_url', { length: 500 }),
  
  // Relationships
  categoryId: integer('category_id').references(() => categories.id),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  tenantIdx: index('idx_products_tenant').on(table.tenantId),
  skuIdx: index('idx_products_sku').on(table.sku),
  categoryIdx: index('idx_products_category').on(table.categoryId),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;