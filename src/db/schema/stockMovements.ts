import { pgTable, serial, integer, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { products } from './products';
import { users } from './users';

export const movementTypeEnum = pgEnum('movement_type', ['IN', 'OUT', 'ADJUST', 'TRANSFER']);

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  reason: varchar('reason', { length: 255 }),
  notes: text('notes'),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('idx_stock_movements_product').on(table.productId),
  dateIdx: index('idx_stock_movements_date').on(table.createdAt),
}));

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;