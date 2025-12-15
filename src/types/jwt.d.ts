// src/types/jwt.d.ts  (or any .d.ts file under src/types/)

import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
   payload: {
      id: number;
      email: string;
      role?: 'admin' | 'manager' | 'staff';
      tenantId?: number | null;
      type?: 'refresh'; // optional for refresh tokens
    };
    user: {
      id: number;
      email: string;
      role: 'admin' | 'manager' | 'staff';
      tenantId: number;
    };
  }
}