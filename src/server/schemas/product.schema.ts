import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format').optional(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  reorderPoint: z.number().int().min(0, 'Reorder point cannot be negative').default(10),
  categoryId: z.number().int().positive('Category ID must be positive').optional(),
  barcode: z.string().max(100).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional(),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format').optional(),
  quantity: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  categoryId: z.number().int().positive().optional(),
  barcode: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
});

export const productQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(20),
  search: z.string().optional(),
  categoryId: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  lowStock: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'price', 'quantity', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;