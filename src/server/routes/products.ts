import type { FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../middleware/auth';
import { productService } from '../services/product.service';
import  type { CreateProductInput, UpdateProductInput } from '../services/product.service';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../schemas/product.schema';

export async function productRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Create product (Admin and Manager only)
  fastify.post(
    '/',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const body = createProductSchema.parse(request.body) as CreateProductInput;
        const tenantId = request.user!.tenantId;

        const product = await productService.createProduct(body, tenantId);

        reply.code(201).send({
          success: true,
          message: 'Product created successfully',
          data: { product },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        reply.code(400).send({
          error: 'Product Creation Failed',
          message: error.message,
        });
      }
    }
  );

  // Get all products with filters
  fastify.get('/', async (request, reply) => {
    try {
      const query = productQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await productService.getProducts(tenantId, {
        page: query.page,
        limit: query.limit,
        search: query.search,
        categoryId: query.categoryId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        lowStock: query.lowStock,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors,
        });
      }

      reply.code(500).send({
        error: 'Failed to fetch products',
        message: error.message,
      });
    }
  });

  // Get low stock products
  fastify.get('/low-stock', async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const products = await productService.getLowStockProducts(tenantId);

      reply.send({
        success: true,
        data: { products, count: products.length },
      });
    } catch (error: any) {
      reply.code(500).send({
        error: 'Failed to fetch low stock products',
        message: error.message,
      });
    }
  });

  // Get product statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const stats = await productService.getProductStats(tenantId);

      reply.send({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      reply.code(500).send({
        error: 'Failed to fetch product statistics',
        message: error.message,
      });
    }
  });

  // Generate SKU
  fastify.get('/generate-sku', async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const sku = await productService.generateSKU(tenantId);

      reply.send({
        success: true,
        data: { sku },
      });
    } catch (error: any) {
      reply.code(500).send({
        error: 'Failed to generate SKU',
        message: error.message,
      });
    }
  });

  // Get single product
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const product = await productService.getProductById(parseInt(id), tenantId);

      reply.send({
        success: true,
        data: { product },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'Product Not Found',
        message: error.message,
      });
    }
  });

  // Update product (Admin and Manager only)
  fastify.put(
    '/:id',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateProductSchema.parse(request.body) as UpdateProductInput;
        const tenantId = request.user!.tenantId;

        const product = await productService.updateProduct(parseInt(id), body, tenantId);

        reply.send({
          success: true,
          message: 'Product updated successfully',
          data: { product },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        const statusCode = error.message === 'Product not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Product Update Failed',
          message: error.message,
        });
      }
    }
  );

  // Delete product (Admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: requireRole('admin'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;

        const deletedProduct = await productService.deleteProduct(parseInt(id), tenantId);

        reply.send({
          success: true,
          message: `Product "${deletedProduct.name}" deleted successfully`,
          data: { id: deletedProduct.id },
        });
      } catch (error: any) {
        const statusCode = error.message === 'Product not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Product Deletion Failed',
          message: error.message,
        });
      }
    }
  );
}