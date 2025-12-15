import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(255),
  description: z.string().max(500).optional(),
  parentId: z.number().int().positive('Parent ID must be positive').optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(500).optional(),
  parentId: z.number().int().positive().optional().nullable(), // Allow null to remove parent
});

export const categoryQuerySchema = z.object({
  includeTree: z.string().transform(val => val === 'true').optional(), // Return as tree structure
  parentId: z.string().transform(Number).pipe(z.number().int()).optional().nullable(), // Filter by parent
  search: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;