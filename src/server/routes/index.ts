import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { productRoutes } from './products.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  fastify.register(authRoutes, { prefix: '/api/auth' });

  // Add more route groups here as you build them
   fastify.register(productRoutes, { prefix: '/api/products' });
  // fastify.register(orderRoutes, { prefix: '/api/orders' });
}