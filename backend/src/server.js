import { createServer } from 'node:http';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env, validateRuntimeEnv } from './config/env.js';
import { attachSocketServer } from './realtime/socketServer.js';

async function start() {
  validateRuntimeEnv();
  await connectDatabase();

  const httpServer = createServer(app);
  attachSocketServer(httpServer);
  httpServer.listen(env.PORT, () => console.info(`Chatz API listening on port ${env.PORT}.`));
}

start().catch((error) => {
  console.error(`Could not start Chatz API: ${error.message}`);
  process.exit(1);
});
