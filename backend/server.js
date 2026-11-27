const { loadEnv } = require("./config/env");
const connectDB = require("./config/db");
const { disconnectDB } = require("./config/db");
const createApp = require("./app");

const listen = (app, port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once("error", reject);
    server.once("listening", () => {
      server.removeListener("error", reject);
      resolve(server);
    });
  });

const startServer = async () => {
  const config = loadEnv();

  await connectDB();

  const app = createApp(config);
  let server;
  try {
    server = await listen(app, config.PORT);
  } catch (error) {
    await disconnectDB();
    throw error;
  }

  console.log(
    `[Server] ProofNest API listening on port ${config.PORT} (${config.NODE_ENV})`
  );

  let shutdownPromise;
  const shutdown = () => {
    if (!shutdownPromise) {
      shutdownPromise = new Promise((resolve, reject) => {
        server.close(async (serverError) => {
          try {
            await disconnectDB();
            if (serverError) {
              throw serverError;
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    return shutdownPromise;
  };

  const handleSignal = () => {
    shutdown().catch(() => {
      console.error("[Server] Graceful shutdown failed");
      process.exitCode = 1;
    });
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  return { server, shutdown };
};

if (require.main === module) {
  startServer().catch(() => {
    console.error(
      "[Server] Startup failed. Check the environment configuration and MongoDB connectivity."
    );
    process.exitCode = 1;
  });
}

module.exports = { startServer };
