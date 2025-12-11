import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";


export const app = Fastify({
  logger: true,
});

// 1. CORS
app.register(cors, {
  origin: "*", // allow all, adjust later for production
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// 2. JWT Auth (use your own secret)
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "supersecret",
});

// Decorate: add app.jwtVerify to request
app.decorate(
  "authenticate",
  async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  }
);

// 1. Register Swagger (spec only)
app.register(fastifySwagger, {
  swagger: {
    info: {
      title: "API Documentation",
      description: "StockWise Backend API",
      version: "1.0.0",
    },
    tags: [{ name: "auth", description: "Authentication Routes" }],
  },
});

// 2. Register Swagger UI (this one has exposeRoute + routePrefix)
app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
});