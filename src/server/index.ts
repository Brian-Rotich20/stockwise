import 'dotenv/config';
import { buildServer } from './fastify';
import { registerRoutes } from './routes/index';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const app = await buildServer();

    // Register routes
    await registerRoutes(app);

    // Start the server
    await app.listen({ port: PORT, host: HOST });

    console.log(`
🚀 Server is running!

📍 Local:   http://localhost:${PORT}
📍 Network: http://${HOST}:${PORT}

🏥 Health:  http://localhost:${PORT}/health
🔐 Auth:    http://localhost:${PORT}/api/auth
    `);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

start();
