import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyError } from "fastify";
// import { authenticate } from './middleware/auth.js'; 

export async function buildServer() {
  const app = Fastify({
    logger: process.env.NODE_ENV === "development"
      ? {
          level: process.env.LOG_LEVEL || "info",
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        }
      : {
          level: process.env.LOG_LEVEL || "info",
        },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "your-secret-key-change-this",
  });

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
  });

  await app.register(fastifySwagger, {
    swagger: {
      info: {
        title: "API Documentation",
        description: "StockWise Backend API",
        version: "1.0.0",
      },
      tags: [{ name: "auth", description: "Authentication Routes" }],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    app.log.error(err);

    reply.status(err.statusCode ?? 500).send({
      error: err.name ?? "Internal Server Error",
      message: err.message ?? "Something went wrong",
      statusCode: err.statusCode ?? 500,
    });
  });

  return app;
}
