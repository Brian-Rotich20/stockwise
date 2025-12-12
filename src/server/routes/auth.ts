import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';
// import { authenticate } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const registerResult = await authService.register(body);
      if (!registerResult || !registerResult.user || !registerResult.tenant) {
        throw new Error('Registration failed: authService.register returned invalid data');
      }
      const { user, tenant } = registerResult;

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        { expiresIn: '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { id: user.id, email: user.email, type: 'refresh' },
        { expiresIn: '7d' }
      );

      reply.code(201).send({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subscriptionPlan: tenant.subscriptionPlan,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors,
        });
      }

      reply.code(400).send({
        error: 'Registration Failed',
        message: error.message || 'Could not register user',
      });
    }
  });

  // Login user
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await authService.login(body.email, body.password);
      if (!user) {
        return reply.code(401).send({ error: 'Login Failed', message: 'Invalid credentials' });
      }

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        { expiresIn: '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { id: user.id, email: user.email, type: 'refresh' },
        { expiresIn: '7d' }
      );

      reply.send({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors,
        });
      }

      reply.code(401).send({
        error: 'Login Failed',
        message: error.message || 'Invalid credentials',
      });
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    try {
      const body = refreshTokenSchema.parse(request.body);

      // Verify refresh token
      const decoded = fastify.jwt.verify(body.refreshToken) as any;
      if (!decoded || decoded.type !== 'refresh' || !decoded.id) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await authService.getUserById(decoded.id);
      if (!user) throw new Error('User not found');

      // Generate new access token
      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        { expiresIn: '15m' }
      );

      reply.send({
        success: true,
        data: { accessToken },
      });
    } catch (error: any) {
      reply.code(401).send({
        error: 'Token Refresh Failed',
        message: error.message || 'Invalid refresh token',
      });
    }
  });

  // Get current user (protected route)
 fastify.get('/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) return reply.code(401).send({ error: 'Not authenticated' });
      const user = await authService.getUserById(userId);
      if (!user) return reply.code(404).send({ error: 'User Not Found' });

      reply.send({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      reply.code(404).send({
        error: 'User Not Found',
        message: error.message,
      });
    }
  });

  // Logout (client should delete tokens, this is just for demonstration)
  fastify.post('/logout', { preHandler: fastify.authenticate }, async (request, reply) => {
    reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}