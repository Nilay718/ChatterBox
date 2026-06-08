/**
 * Test server that uses mongodb-memory-server so no external DB is needed.
 * Run with: node test-server.js
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set env vars before importing server code
process.env.NODE_ENV = 'development';
process.env.PORT = '5000';
process.env.JWT_ACCESS_SECRET = 'chatterbox_dev_access_secret_k3y!';
process.env.JWT_REFRESH_SECRET = 'chatterbox_dev_refresh_secret_k3y!';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';

async function start() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  console.log(`MongoDB Memory Server started at: ${uri}`);

  // Now dynamically import the server (which reads env vars on import)
  const { default: app } = await import('./server.js');
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await mongod.stop();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('Failed to start test server:', err);
  process.exit(1);
});
