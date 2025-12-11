import { pgTable, integer, decimal, primaryKey } from 'drizzle-orm/pg-core';
import { products } from './products';
import { suppliers } from './suppliers';

// Junction table for many-to-many relationship
export const productSuppliers = pgTable('product_suppliers', {
  productId: integer('product_id').references(() => products.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  leadTimeDays: integer('lead_time_days').default(7),
  supplierPrice: decimal('supplier_price', { precision: 10, scale: 2 }),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.supplierId] }),
}));

export type ProductSupplier = typeof productSuppliers.$inferSelect;
export type NewProductSupplier = typeof productSuppliers.$inferInsert;