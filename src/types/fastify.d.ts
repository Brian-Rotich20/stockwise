// src/types/fastify.d.ts  (or any file included in tsconfig)

import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: number;
      email: string;
      role: 'admin' | 'manager' | 'staff';
      tenantId: number;
    } | null; // null if not authenticated
    tenantId?: number; // optional, set in middleware
  }
}

export {};  
