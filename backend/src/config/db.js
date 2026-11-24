/**
 * Database Connection & GridFS Bucket Initialization
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

let gridFSBucket = null;
let connectionPromise = null;

const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
};

const connectDB = async (overrideUri) => {
  if (mongoose.connection.readyState === 1 && gridFSBucket) {
    return { connection: mongoose.connection, gridFSBucket };
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  const rawUri = overrideUri || process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!rawUri) {
    const errorMsg = 'MongoDB connection failed: Neither MONGO_URI nor MONGODB_URI is defined.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const targetDbName = 'proofnest';

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(rawUri, {
        dbName: targetDbName,
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 8000,
      });

      const db = conn.connection.db;
      gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'documentsBucket'
      });

      const host = conn.connection.host || 'unknown-host';
      console.log(`[Database] MongoDB connected: host=${host}, database=${conn.connection.name}`);
      return { connection: conn.connection, gridFSBucket };
    } catch (error) {
      // Resilience fallback for Windows DNS querySrv EBADRESP on Atlas clusters
      if (
        (error.code === 'EBADRESP' || (error.message && error.message.includes('querySrv EBADRESP'))) &&
        rawUri.includes('proofnestcluster')
      ) {
        const credMatch = rawUri.match(/\/\/([^@]+)@/);
        if (credMatch) {
          const creds = credMatch[1];
          const seedlistUri = `mongodb://${creds}@ac-t5kqn9l-shard-00-00.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-01.aiu5b6f.mongodb.net:27017,ac-t5kqn9l-shard-00-02.aiu5b6f.mongodb.net:27017/proofnest?ssl=true&replicaSet=atlas-24x8j5-shard-0&authSource=admin&retryWrites=true&w=majority`;
          try {
            const fallbackConn = await mongoose.connect(seedlistUri, {
              dbName: targetDbName,
              autoIndex: process.env.NODE_ENV !== 'production',
              serverSelectionTimeoutMS: 8000,
            });

            gridFSBucket = new mongoose.mongo.GridFSBucket(fallbackConn.connection.db, {
              bucketName: 'documentsBucket'
            });

            const host = fallbackConn.connection.host || 'unknown-host';
            console.log(`[Database] MongoDB Atlas connected via replica seedlist: host=${host}, database=${fallbackConn.connection.name}`);
            return { connection: fallbackConn.connection, gridFSBucket };
          } catch (seedError) {
            console.error(`[Database] Seedlist connection error to [${sanitizeMongoUri(rawUri)}]: ${seedError.message}`);
            connectionPromise = null;
            throw seedError;
          }
        }
      }

      console.error(`[Database] MongoDB connection error to [${sanitizeMongoUri(rawUri)}]: ${error.message}`);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

const getGridFSBucket = () => {
  if (!gridFSBucket) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'documentsBucket'
      });
      return gridFSBucket;
    }
    throw new Error('GridFSBucket is not initialized. Call connectDB() first.');
  }
  return gridFSBucket;
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    gridFSBucket = null;
    connectionPromise = null;
    console.log('[Database] MongoDB connection closed.');
  }
};

module.exports = {
  connectDB,
  getGridFSBucket,
  disconnectDB,
  sanitizeMongoUri
};
