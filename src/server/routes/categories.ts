import type { FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../middleware/auth.js';
import { categoryService,  } from '../services/category.service.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../services/category.service.js';
import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from '../schemas/category.schema.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Create category (Admin and Manager only)
  fastify.post(
    '/',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const body = createCategorySchema.parse(request.body) as CreateCategoryInput;
        const tenantId = request.user!.tenantId;

        const category = await categoryService.createCategory(body, tenantId);

        reply.code(201).send({
          success: true,
          message: 'Category created successfully',
          data: { category },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        reply.code(400).send({
          error: 'Category Creation Failed',
          message: error.message,
        });
      }
    }
  );

  // Get all categories
  fastify.get('/', async (request, reply) => {
    try {
      const query = categoryQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      // Return tree structure if requested
      if (query.includeTree) {
        const tree = await categoryService.getCategoryTree(tenantId);
        return reply.send({
          success: true,
          data: { categories: tree },
        });
      }

      // Return flat list with filters
      const categories = await categoryService.getCategories(tenantId, {
        search: query.search,
        parentId: query.parentId,
      });

      reply.send({
        success: true,
        data: { categories, count: categories.length },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors,
        });
      }

      reply.code(500).send({
        error: 'Failed to fetch categories',
        message: error.message,
      });
    }
  });

  // Get category statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const stats = await categoryService.getCategoryStats(tenantId);

      reply.send({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      reply.code(500).send({
        error: 'Failed to fetch category statistics',
        message: error.message,
      });
    }
  });

  // Get single category with details
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const category = await categoryService.getCategoryById(parseInt(id), tenantId);

      reply.send({
        success: true,
        data: { category },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'Category Not Found',
        message: error.message,
      });
    }
  });

  // Get category path (breadcrumb)
  fastify.get('/:id/path', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const path = await categoryService.getCategoryPath(parseInt(id), tenantId);

      reply.send({
        success: true,
        data: { path },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'Category Not Found',
        message: error.message,
      });
    }
  });

  // Update category (Admin and Manager only)
  fastify.put(
    '/:id',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateCategorySchema.parse(request.body) as UpdateCategoryInput;
        const tenantId = request.user!.tenantId;

        const category = await categoryService.updateCategory(parseInt(id), body, tenantId);

        reply.send({
          success: true,
          message: 'Category updated successfully',
          data: { category },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        const statusCode = error.message === 'Category not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Category Update Failed',
          message: error.message,
        });
      }
    }
  );

  // Move category to new parent (Admin and Manager only)
  fastify.patch(
    '/:id/move',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { parentId } = request.body as { parentId: number | null };
        const tenantId = request.user!.tenantId;

        const category = await categoryService.moveCategory(parseInt(id), parentId, tenantId);

        reply.send({
          success: true,
          message: 'Category moved successfully',
          data: { category },
        });
      } catch (error: any) {
        reply.code(400).send({
          error: 'Move Category Failed',
          message: error.message,
        });
      }
    }
  );

  // Delete category (Admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: requireRole('admin'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;

        const deletedCategory = await categoryService.deleteCategory(parseInt(id), tenantId);

        reply.send({
          success: true,
          message: `Category "${deletedCategory.name}" deleted successfully`,
          data: { id: deletedCategory.id },
        });
      } catch (error: any) {
        const statusCode = error.message === 'Category not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Category Deletion Failed',
          message: error.message,
        });
      }
    }
  );
}