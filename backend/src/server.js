const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { startReminderJob } = require('./jobs/reminderScheduler');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Establish database connection and initialize GridFS
    await connectDB();

    // 2. Start automated warranty & return reminder job
    startReminderJob();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`[ProofNest Server] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    const shutdown = async () => {
      console.log('[ProofNest Server] Shutting down gracefully...');
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[ProofNest Server] Failed to start:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
