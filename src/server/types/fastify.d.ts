import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      role: 'admin' | 'manager' | 'staff';
      tenantId: number;
    };
    tenantId?: number;
  }
  interface FastifyInstance {
    authenticate: any;
  }
}