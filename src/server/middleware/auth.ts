import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT token
    await request.jwtVerify();

    // JWT payload is automatically attached to request.user by @fastify/jwt
    const payload = request.user as any;

    // Fetch full user details
    const user = await authService.getUserById(payload.id);

    // Attach user to request
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'admin' | 'manager' | 'staff',
      tenantId: user.tenantId,
    };

    request.tenantId = user.tenantId;
  } catch (error) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

// Role-based access control
export function requireRole(...roles: Array<'admin' | 'manager' | 'staff'>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userRole = (request.user as { role?: 'admin' | 'manager' | 'staff' }).role;

    if (!userRole || !roles.includes(userRole)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}

// Tenant isolation middleware
export async function ensureTenantContext(request: FastifyRequest, reply: FastifyReply) {
  if (!request.tenantId) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: 'Tenant context is required',
    });
  }
}