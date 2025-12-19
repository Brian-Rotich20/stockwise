import type{ FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../middleware/auth.js';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  LinkProductInput,
  UpdateProductLinkInput,
} from '../services/supplier.service.js';
import { supplierService } from '../services/supplier.service.js';
import {
  createSupplierSchema,
  updateSupplierSchema,
  linkProductSchema,
  updateProductLinkSchema,
  supplierQuerySchema,
} from '../schemas/supplier.schema.js';

export async function supplierRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Create supplier (Admin and Manager only)
  fastify.post(
    '/',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const body = createSupplierSchema.parse(request.body) as CreateSupplierInput;
        const tenantId = request.user!.tenantId;

        const supplier = await supplierService.createSupplier(body, tenantId);

        reply.code(201).send({
          success: true,
          message: 'Supplier created successfully',
          data: { supplier },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        reply.code(400).send({
          error: 'Supplier Creation Failed',
          message: error.message,
        });
      }
    }
  );

  // Get all suppliers
  fastify.get('/', async (request, reply) => {
    try {
      const query = supplierQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await supplierService.getSuppliers(tenantId, {
        page: query.page,
        limit: query.limit,
        search: query.search,
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
        error: 'Failed to fetch suppliers',
        message: error.message,
      });
    }
  });

  // Get supplier statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const stats = await supplierService.getSupplierStats(tenantId);

      reply.send({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      reply.code(500).send({
        error: 'Failed to fetch supplier statistics',
        message: error.message,
      });
    }
  });

  // Get single supplier
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const supplier = await supplierService.getSupplierById(parseInt(id), tenantId);

      reply.send({
        success: true,
        data: { supplier },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'Supplier Not Found',
        message: error.message,
      });
    }
  });

  // Get products for a supplier
  fastify.get('/:id/products', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const products = await supplierService.getSupplierProducts(parseInt(id), tenantId);

      reply.send({
        success: true,
        data: { products, count: products.length },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'Failed to fetch supplier products',
        message: error.message,
      });
    }
  });

  // Update supplier (Admin and Manager only)
  fastify.put(
    '/:id',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateSupplierSchema.parse(request.body) as UpdateSupplierInput;
        const tenantId = request.user!.tenantId;

        const supplier = await supplierService.updateSupplier(parseInt(id), body, tenantId);

        reply.send({
          success: true,
          message: 'Supplier updated successfully',
          data: { supplier },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        const statusCode = error.message === 'Supplier not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Supplier Update Failed',
          message: error.message,
        });
      }
    }
  );

  // Link product to supplier (Admin and Manager only)
  fastify.post(
    '/:id/products',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = linkProductSchema.parse(request.body) as LinkProductInput;
        const tenantId = request.user!.tenantId;

        const link = await supplierService.linkProduct(parseInt(id), body, tenantId);

        reply.code(201).send({
          success: true,
          message: 'Product linked to supplier successfully',
          data: { link },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        reply.code(400).send({
          error: 'Product Link Failed',
          message: error.message,
        });
      }
    }
  );

  // Update product link (Admin and Manager only)
  fastify.put(
    '/:supplierId/products/:productId',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { supplierId, productId } = request.params as { supplierId: string; productId: string };
        const body = updateProductLinkSchema.parse(request.body) as UpdateProductLinkInput;
        const tenantId = request.user!.tenantId;

        const link = await supplierService.updateProductLink(
          parseInt(supplierId),
          parseInt(productId),
          body,
          tenantId
        );

        reply.send({
          success: true,
          message: 'Product link updated successfully',
          data: { link },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors,
          });
        }

        reply.code(400).send({
          error: 'Product Link Update Failed',
          message: error.message,
        });
      }
    }
  );

  // Remove product link (Admin and Manager only)
  fastify.delete(
    '/:supplierId/products/:productId',
    {
      preHandler: requireRole('admin', 'manager'),
    },
    async (request, reply) => {
      try {
        const { supplierId, productId } = request.params as { supplierId: string; productId: string };
        const tenantId = request.user!.tenantId;

        await supplierService.unlinkProduct(parseInt(supplierId), parseInt(productId), tenantId);

        reply.send({
          success: true,
          message: 'Product unlinked from supplier successfully',
        });
      } catch (error: any) {
        reply.code(400).send({
          error: 'Product Unlink Failed',
          message: error.message,
        });
      }
    }
  );

  // Delete supplier (Admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: requireRole('admin'),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;

        const deletedSupplier = await supplierService.deleteSupplier(parseInt(id), tenantId);

        reply.send({
          success: true,
          message: `Supplier "${deletedSupplier.name}" deleted successfully`,
          data: { id: deletedSupplier.id },
        });
      } catch (error: any) {
        const statusCode = error.message === 'Supplier not found' ? 404 : 400;
        reply.code(statusCode).send({
          error: 'Supplier Deletion Failed',
          message: error.message,
        });
      }
    }
  );
}