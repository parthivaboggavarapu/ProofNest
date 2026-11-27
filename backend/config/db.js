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
let connectionUri = null;
let inFlightUri = null;
const atlasFallbackHosts = new Set([
  "proofnestcluster.mongodb.net",
  "proofnestcluster.aiu5b6f.mongodb.net",
]);

/**
 * Sanitizes MongoDB connection URI for safe console logging (masks credentials).
 * @param {string} uri 
 * @returns {string}
 */
const sanitizeMongoUri = (uri) => {
  if (!uri) return "";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
};

const isAllowedAtlasFallbackUri = (uri) => {
  try {
    const parsedUri = new URL(uri);
    return (
      parsedUri.protocol === "mongodb+srv:" &&
      atlasFallbackHosts.has(parsedUri.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
};

/**
 * Connect to MongoDB ProofNest database.
 * 
 * Reuses a connection only when its requested URI matches the tracked URI.
 * Includes a restricted DNS fallback for normal application startup.
 * 
 * @param {string} [overrideUri] - Optional URI override (primarily for tests)
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
const connectDB = async (overrideUri) => {
  const hasExplicitOverride = overrideUri !== undefined && overrideUri !== null;
  const requestedUri = hasExplicitOverride
    ? overrideUri
    : process.env.MONGO_URI || process.env.MONGODB_URI;
  const readyState = mongoose.connection.readyState;

  if (readyState === 1) {
    if (!requestedUri) {
      throw new Error(
        "Cannot reuse the active MongoDB connection because no URI was supplied."
      );
    }
    if (requestedUri !== connectionUri) {
      throw new Error(
        "MongoDB is already connected to a different or untracked URI; disconnect before requesting another connection."
      );
    }
    return mongoose;
  }

  if (readyState === 2 && connectionPromise) {
    if (!requestedUri) {
      throw new Error(
        "Cannot reuse the in-flight MongoDB connection because no URI was supplied."
      );
    }
    if (requestedUri !== inFlightUri) {
      throw new Error(
        "A MongoDB connection to a different URI is already in progress."
      );
    }
    return connectionPromise;
  }

  if (readyState === 2) {
    throw new Error(
      "A MongoDB connection is already in progress outside connectDB; refusing to reuse it."
    );
  }

  if (readyState === 3) {
    throw new Error("MongoDB is disconnecting; retry after it has closed.");
  }

  const rawUri = requestedUri;

  if (!rawUri) {
    console.error("[Database] MongoDB connection URI is not configured.");
    throw new Error("MONGO_URI is required to connect to MongoDB.");
  }

  connectionUri = null;
  inFlightUri = rawUri;
  const targetDbName = "proofnest";
  let connectionSucceeded = false;
  let pendingConnection;

  pendingConnection = (async () => {
    try {
      const conn = await Promise.resolve().then(() =>
        mongoose.connect(rawUri, {
          dbName: targetDbName,
          autoIndex:
            process.env.NODE_ENV !== "production" &&
            process.env.NODE_ENV !== "test",
          serverSelectionTimeoutMS: 8000,
        })
      );

      connectionSucceeded = true;
      connectionUri = rawUri;
      const host = conn.connection.host || "unknown-host";
      const dbName = conn.connection.name || targetDbName;
      console.log(`[Database] MongoDB Atlas connected successfully: host=${host}, database=${dbName}`);
      return conn;
    } catch (error) {
      const isDnsSrvError =
        error.code === "EBADRESP" ||
        (typeof error.message === "string" &&
          error.message.includes("querySrv EBADRESP"));
      const mayUseAtlasFallback =
        !hasExplicitOverride &&
        process.env.NODE_ENV !== "test" &&
        isDnsSrvError &&
        isAllowedAtlasFallbackUri(rawUri);

      if (mayUseAtlasFallback) {
        const credMatch = rawUri.match(/\/\/([^@]+)@/);
        if (credMatch) {
          const creds = credMatch[1];
          const seedlistUri = `mongodb://${creds}@ac-t5kqn9l-shard-00-00.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-01.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-02.aiu5b6f.mongodb.net:27017/proofnest?ssl=true&replicaSet=atlas-24x8j5-shard-0&authSource=admin&retryWrites=true&w=majority`;
          try {
            const fallbackConn = await mongoose.connect(seedlistUri, {
              dbName: targetDbName,
              autoIndex:
                process.env.NODE_ENV !== "production" &&
                process.env.NODE_ENV !== "test",
              serverSelectionTimeoutMS: 8000,
            });
            connectionSucceeded = true;
            connectionUri = rawUri;
            const host = fallbackConn.connection.host || "unknown-host";
            const dbName = fallbackConn.connection.name || targetDbName;
            console.log(
              `[Database] MongoDB Atlas connected successfully via replica set seedlist: host=${host}, database=${dbName}`
            );
            return fallbackConn;
          } catch {
            console.error(
              "[Database] MongoDB Atlas fallback connection failed; URI and credentials omitted."
            );
            throw new Error(
              "MongoDB connection failed. Check connectivity and credentials."
            );
          }
        }
      }

      console.error(
        "[Database] MongoDB connection failed; URI and credentials omitted."
      );
      throw new Error(
        "MongoDB connection failed. Check connectivity and credentials."
      );
    } finally {
      if (connectionPromise === pendingConnection) {
        connectionPromise = null;
        inFlightUri = null;
      }
      if (!connectionSucceeded) {
        connectionUri = null;
      }
    }
  })();

  connectionPromise = pendingConnection;
  return pendingConnection;
};

/**
 * Gracefully disconnects from MongoDB.
 * Useful for test suites and graceful server shutdown.
 */
const disconnectDB = async () => {
  const wasConnected = mongoose.connection.readyState !== 0;
  try {
    if (wasConnected) {
      await mongoose.disconnect();
    }
  } finally {
    if (mongoose.connection.readyState === 0) {
      connectionPromise = null;
      connectionUri = null;
      inFlightUri = null;
    }
  }

  if (wasConnected && mongoose.connection.readyState === 0) {
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
