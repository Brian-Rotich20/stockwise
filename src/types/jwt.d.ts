// src/types/jwt.d.ts  (or any .d.ts file under src/types/)

import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // This types the payload (the decoded JWT contents)
    // Adjust if your actual JWT contains different fields
    payload: { id: number }; // example: whatever is in your signed JWT

    // This types request.user — THIS IS THE KEY PART
    user: {
      id: number;
      email: string;
      role: 'admin' | 'manager' | 'staff';
      tenantId: number;
    };
  }
}