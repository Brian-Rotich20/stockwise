import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  contactPerson: z.string().max(255).optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  contactPerson: z.string().max(255).optional(),
});

export const linkProductSchema = z.object({
  productId: z.number().int().positive('Product ID must be positive'),
  supplierPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional(),
  leadTimeDays: z.number().int().min(0, 'Lead time cannot be negative').optional(),
});

export const updateProductLinkSchema = z.object({
  supplierPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional(),
  leadTimeDays: z.number().int().min(0, 'Lead time cannot be negative').optional(),
});

export const supplierQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(20),
  search: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type LinkProductInput = z.infer<typeof linkProductSchema>;
export type UpdateProductLinkInput = z.infer<typeof updateProductLinkSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;