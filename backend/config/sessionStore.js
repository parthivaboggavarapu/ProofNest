/**
 * ProofNest Session Store Configuration Module
 * 
 * Configures the MongoDB-backed session store for express-session using connect-mongo.
 * Database: proofnest
 * Collection: sessions
 * 
 * Note: The backend developer will mount express-session middleware in the Express app.
 * Standardized Database Connection Variable: MONGO_URI
 */

const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");

/**
 * Returns configuration parameters for connect-mongo pointing strictly to the proofnest database.
 * 
 * @param {Object} [overrides={}] - Optional custom overrides
 * @returns {Object} MongoStore options
 */
const getSessionStoreConfig = (overrides = {}) => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  const baseConfig = {
    dbName: "proofnest",
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days in seconds
    autoRemove: "native", // Delegates session cleanup to MongoDB native TTL index
    touchAfter: 24 * 3600, // Update session in DB only once every 24 hours unless session data changes
    stringify: true,
  };

  // If mongoose is connected, reuse its MongoClient instance; otherwise fallback to mongoUrl
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    baseConfig.client = mongoose.connection.getClient();
  } else if (mongoUri) {
    baseConfig.mongoUrl = mongoUri;
  }

  // Connect-mongo optional database-level session encryption
  if (overrides.crypto) {
    baseConfig.crypto = overrides.crypto;
  }

  return { ...baseConfig, ...overrides };
};

/**
 * Creates and returns an instance of connect-mongo MongoStore.
 * 
 * @param {Object} [overrides={}] - Custom configuration overrides
 * @returns {MongoStore} Initialized connect-mongo store
 */
const createSessionStore = (overrides = {}) => {
  const config = getSessionStoreConfig(overrides);

  if (!config.client && !config.mongoUrl) {
    throw new Error(
      "Session store initialization failed: neither an active Mongoose connection nor MONGO_URI is available."
    );
  }

  return MongoStore.create(config);
};

module.exports = {
  createSessionStore,
  getSessionStoreConfig,
};
