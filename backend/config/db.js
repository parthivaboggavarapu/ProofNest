/**
 * ProofNest Database Connection Module
 * 
 * Configures and maintains a resilient Mongoose connection to MongoDB Atlas / Local MongoDB.
 * Target Database: proofnest
 * Standardized Connection Variable: MONGO_URI
 */

const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Track in-flight connection promise to prevent race conditions & duplicate connections
let connectionPromise = null;

/**
 * Sanitizes MongoDB connection URI for safe console logging (masks credentials).
 * @param {string} uri 
 * @returns {string}
 */
const sanitizeMongoUri = (uri) => {
  if (!uri) return "";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
};

/**
 * Connect to MongoDB ProofNest database.
 * 
 * Reuses existing connection if already established or in progress.
 * Includes automatic resilience fallback for Windows DNS querySrv EBADRESP.
 * 
 * @param {string} [overrideUri] - Optional URI override (primarily for tests)
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
const connectDB = async (overrideUri) => {
  // 1. If connection is already open, return existing instance
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If connection is in the process of connecting, await the active promise
  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  const rawUri = overrideUri || process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!rawUri) {
    const errorMsg =
      "MongoDB connection failed: MONGO_URI is not defined in environment variables. " +
      "Please set MONGO_URI in backend/.env.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const targetDbName = "proofnest";

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(rawUri, {
        dbName: targetDbName,
        autoIndex: process.env.NODE_ENV !== "production", // Build indexes automatically in non-prod
        serverSelectionTimeoutMS: 8000,
      });

      const host = conn.connection.host || "unknown-host";
      const dbName = conn.connection.name || targetDbName;
      console.log(`[Database] MongoDB Atlas connected successfully: host=${host}, database=${dbName}`);
      return conn;
    } catch (error) {
      // Resilience fallback: If Node c-ares DNS resolver returns querySrv EBADRESP on Windows,
      // fallback to the direct Atlas replica set host seedlist
      if (
        (error.code === "EBADRESP" || error.message.includes("querySrv EBADRESP")) &&
        rawUri.includes("proofnestcluster")
      ) {
        const credMatch = rawUri.match(/\/\/([^@]+)@/);
        if (credMatch) {
          const creds = credMatch[1];
          const seedlistUri = `mongodb://${creds}@ac-t5kqn9l-shard-00-00.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-01.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-02.aiu5b6f.mongodb.net:27017/proofnest?ssl=true&replicaSet=atlas-24x8j5-shard-0&authSource=admin&retryWrites=true&w=majority`;
          try {
            const fallbackConn = await mongoose.connect(seedlistUri, {
              dbName: targetDbName,
              autoIndex: process.env.NODE_ENV !== "production",
              serverSelectionTimeoutMS: 8000,
            });
            const host = fallbackConn.connection.host || "unknown-host";
            const dbName = fallbackConn.connection.name || targetDbName;
            console.log(
              `[Database] MongoDB Atlas connected successfully via replica set seedlist: host=${host}, database=${dbName}`
            );
            return fallbackConn;
          } catch (seedError) {
            console.error(
              `[Database] MongoDB seedlist connection error to [${sanitizeMongoUri(rawUri)}]: ${seedError.message}`
            );
            connectionPromise = null;
            throw seedError;
          }
        }
      }

      console.error(
        `[Database] MongoDB connection error to [${sanitizeMongoUri(rawUri)}]: ${error.message}`
      );
      connectionPromise = null; // Reset promise so subsequent retries can proceed
      throw error;
    }
  })();

  return connectionPromise;
};

/**
 * Gracefully disconnects from MongoDB.
 * Useful for test suites and graceful server shutdown.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionPromise = null;
    console.log("[Database] MongoDB connection closed.");
  }
};

// If executed directly (e.g. node backend/config/db.js), run an immediate health check
if (require.main === module) {
  connectDB()
    .then(async () => {
      console.log("[Database] Connection health check passed.");
      await disconnectDB();
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.sanitizeMongoUri = sanitizeMongoUri;
