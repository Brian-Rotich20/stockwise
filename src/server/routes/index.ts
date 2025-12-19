import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { productRoutes } from './products.js';
import { categoryRoutes } from './categories.js';
import { supplierRoutes } from './suppliers.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  fastify.register(authRoutes, { prefix: '/api/auth' });

  // Add more route groups here as you build them
   fastify.register(productRoutes, { prefix: '/api/products' });
  // fastify.register(orderRoutes, { prefix: '/api/orders' });

  fastify.register(categoryRoutes, { prefix: '/api/categories' });
  fastify.register(supplierRoutes, { prefix: '/api/suppliers' });
}
