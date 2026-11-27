const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const mongoose = require("mongoose");
const { Store } = require("express-session");
const createApp = require("../app");
const errorHandler = require("../middleware/errorHandler");
const AppError = require("../utils/AppError");
const { validateEnv } = require("../config/env");
const database = require("../config/db");
const { getSessionStoreConfig } = require("../config/sessionStore");

const config = {
  NODE_ENV: "test",
  PORT: 4000,
  MONGO_URI: "mongodb://127.0.0.1:27017/proofnest_test",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_SECRET: "foundation-test-session-secret-0123456789",
  TRUST_PROXY: 0,
};

class NoopSessionStore extends Store {
  get(sessionId, callback) {
    callback(null, null);
  }

  set(sessionId, sessionData, callback) {
    if (callback) callback(null);
  }

  destroy(sessionId, callback) {
    if (callback) callback(null);
  }
}

const createTestApp = (appConfig = config) =>
  createApp(appConfig, {
    sessionStoreFactory: () => new NoopSessionStore(),
  });

const withMockedDatabaseConnection = async (run) => {
  const originalConnect = mongoose.connect;
  const originalDisconnect = mongoose.disconnect;
  const originalReadyState = mongoose.connection.readyState;
  const originalConsoleLog = console.log;
  const environmentKeys = ["NODE_ENV", "MONGO_URI", "MONGODB_URI"];
  const originalEnvironment = {};

  for (const key of environmentKeys) {
    originalEnvironment[key] = process.env[key];
  }
  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = "mongodb://unit-test.invalid/proofnest";
  delete process.env.MONGODB_URI;
  mongoose.connection.readyState = 0;
  console.log = () => {};
  mongoose.disconnect = async () => {
    mongoose.connection.readyState = 0;
  };

  try {
    await run();
  } finally {
    await database.disconnectDB();
    mongoose.connect = originalConnect;
    mongoose.disconnect = originalDisconnect;
    mongoose.connection.readyState = originalReadyState;
    console.log = originalConsoleLog;
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnvironment[key];
      }
    }
  }
};

const request = async (app, { method = "GET", path = "/", headers = {}, body }) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    return await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, method, path, headers },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
        }
      );
      req.on("error", reject);
      if (body !== undefined) {
        req.write(body);
      }
      req.end();
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

test("validates required environment variables without revealing values", () => {
  assert.throws(
    () => validateEnv({}),
    (error) => {
      assert.equal(error.name, "EnvironmentValidationError");
      assert.match(error.message, /NODE_ENV is required/);
      assert.doesNotMatch(error.message, /mongodb:\/\/|password/i);
      return true;
    }
  );
});

test("rejects malformed ports and non-origin frontend URLs", () => {
  assert.throws(
    () => validateEnv({ ...config, PORT: "70000", FRONTEND_URL: "https://example.com/app" }),
    (error) => error.name === "EnvironmentValidationError"
  );
});

test("requires a sufficiently long session secret", () => {
  assert.throws(
    () => validateEnv({ ...config, SESSION_SECRET: "too-short" }),
    (error) => error.name === "EnvironmentValidationError"
  );
});

test("validates TRUST_PROXY as a bounded hop count and defaults to zero", () => {
  const validConfig = { ...config, PORT: "4000" };
  delete validConfig.TRUST_PROXY;
  assert.equal(validateEnv(validConfig).TRUST_PROXY, 0);
  assert.equal(
    validateEnv({ ...validConfig, TRUST_PROXY: "2" }).TRUST_PROXY,
    2
  );
  assert.throws(
    () => validateEnv({ ...validConfig, TRUST_PROXY: "true" }),
    (error) => error.name === "EnvironmentValidationError"
  );
  assert.throws(
    () => validateEnv({ ...validConfig, TRUST_PROXY: "11" }),
    (error) => error.name === "EnvironmentValidationError"
  );
});

test("initializes the Express application with the configured environment", () => {
  const app = createTestApp();
  assert.equal(typeof app, "function");
  assert.equal(app.locals.environment, "test");
  assert.equal(app.get("trust proxy"), 0);
});

test("configures Express with the validated trust-proxy hop count", () => {
  const app = createTestApp({ ...config, TRUST_PROXY: 2 });
  assert.equal(app.get("trust proxy"), 2);
});


test("health endpoint reports app, time, environment, and MongoDB status", async () => {
  const response = await request(createTestApp(), { path: "/api/health" });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 503);
  assert.equal(payload.success, false);
  assert.equal(payload.data.status, "unhealthy");
  assert.equal(payload.data.environment, "test");
  assert.equal(payload.data.mongodb, "disconnected");
  assert.equal(Number.isNaN(Date.parse(payload.data.timestamp)), false);
  assert.equal(JSON.stringify(payload).includes(config.MONGO_URI), false);
});


test("unknown routes return the standard 404 response", async () => {
  const response = await request(createTestApp(), { path: "/api/missing" });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 404);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "NOT_FOUND");
});

test("invalid JSON returns a consistent client error", async () => {
  const response = await request(createTestApp(), {
    method: "POST",
    path: "/api/health",
    headers: { "content-type": "application/json" },
    body: "{invalid",
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "INVALID_JSON");
});

test("error middleware maps application errors to the response envelope", () => {
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const req = { app: { locals: { environment: "test" } } };

  errorHandler(new AppError("Invalid input", 422, "VALIDATION_ERROR"), req, res, () => {
    assert.fail("next should not be called");
  });

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.deepEqual(res.body.error.details, []);
});

test("Mongoose validation errors return field details", () => {
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const req = { app: { locals: { environment: "test" } } };
  const validationError = {
    name: "ValidationError",
    errors: { email: { message: "Email is invalid" } },
  };

  errorHandler(validationError, req, res, () => {
    assert.fail("next should not be called");
  });

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.deepEqual(res.body.error.details, [
    { field: "email", message: "Email is invalid" },
  ]);
});

test("production error responses do not disclose internal messages or stacks", () => {
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const req = { app: { locals: { environment: "production" } } };
  const internalError = new Error("sensitive internal detail");

  errorHandler(internalError, req, res, () => {
    assert.fail("next should not be called");
  });

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.message, "Internal server error");
  assert.equal(JSON.stringify(res.body).includes("sensitive internal detail"), false);
});

test("production application errors with server status are also sanitized", () => {
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const req = { app: { locals: { environment: "production" } } };

  errorHandler(
    new AppError("sensitive application detail", 500, "PRIVATE_ERROR"),
    req,
    res,
    () => {
      assert.fail("next should not be called");
    }
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(res.body.error.message, "Internal server error");
});

test("CORS allows the configured frontend origin with credentials", async () => {
  const response = await request(createTestApp(), {
    method: "OPTIONS",
    path: "/api/health",
    headers: {
      origin: config.FRONTEND_URL,
      "access-control-request-method": "GET",
    },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], config.FRONTEND_URL);
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});


test("CORS does not grant access to an unconfigured origin", async () => {
  const response = await request(createTestApp(), {
    path: "/api/health",
    headers: { origin: "https://untrusted.example" },
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});


test("rejects a different URI when MongoDB is already connected", async () => {
  await withMockedDatabaseConnection(async () => {
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      mongoose.connection.readyState = 1;
      return mongoose;
    };

    await database.connectDB("mongodb://first-unit-test.invalid/proofnest");
    await assert.rejects(
      database.connectDB("mongodb://second-unit-test.invalid/proofnest"),
      /different or untracked URI/
    );
    assert.equal(connectCalls, 1);
  });
});

test("rejects an active connection when no URI is requested", async () => {
  await withMockedDatabaseConnection(async () => {
    mongoose.connect = async () => {
      mongoose.connection.readyState = 1;
      return mongoose;
    };

    await database.connectDB("mongodb://active-unit-test.invalid/proofnest");
    delete process.env.MONGO_URI;
    delete process.env.MONGODB_URI;
    await assert.rejects(database.connectDB(), /no URI was supplied/);
  });
});

test("allows a different URI after a failed connection resets in-flight tracking", async () => {
  await withMockedDatabaseConnection(async () => {
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      if (connectCalls === 1) {
        throw new Error("mock connection failure");
      }
      mongoose.connection.readyState = 1;
      return mongoose;
    };

    await assert.rejects(
      database.connectDB("mongodb://first-unit-test.invalid/proofnest"),
      /MongoDB connection failed/
    );
    await database.connectDB("mongodb://second-unit-test.invalid/proofnest");
    assert.equal(connectCalls, 2);
  });
});

test("allows a different URI after disconnecting the active connection", async () => {
  await withMockedDatabaseConnection(async () => {
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      mongoose.connection.readyState = 1;
      return mongoose;
    };

    await database.connectDB("mongodb://first-unit-test.invalid/proofnest");
    await database.disconnectDB();
    await database.connectDB("mongodb://second-unit-test.invalid/proofnest");
    assert.equal(connectCalls, 2);
  });
});

test("rejects a different URI while MongoDB is connecting", async () => {
  await withMockedDatabaseConnection(async () => {
    let rejectConnection;
    mongoose.connect = () => {
      mongoose.connection.readyState = 2;
      return new Promise((resolve, reject) => {
        rejectConnection = reject;
      });
    };

    const firstConnection = database.connectDB(
      "mongodb://first-unit-test.invalid/proofnest"
    );
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(
      database.connectDB("mongodb://second-unit-test.invalid/proofnest"),
      /different URI is already in progress/
    );

    rejectConnection(new Error("mock connection failure"));
    await assert.rejects(firstConnection, /MongoDB connection failed/);
  });
});

test("blocks Atlas DNS fallback in test mode without logging credentials", async () => {
  await withMockedDatabaseConnection(async () => {
    process.env.MONGO_URI =
      "mongodb+srv://unit-user:unit-secret@proofnestcluster.mongodb.net/proofnest";
    let connectCalls = 0;
    const logs = [];
    const originalConsoleError = console.error;
    mongoose.connect = async () => {
      connectCalls++;
      const error = new Error("querySrv EBADRESP");
      error.code = "EBADRESP";
      throw error;
    };
    console.error = (...args) => logs.push(args.join(" "));

    try {
      await assert.rejects(database.connectDB(), /MongoDB connection failed/);
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(connectCalls, 1);
    assert.equal(logs.some((message) => message.includes("unit-secret")), false);
  });
});

test("blocks Atlas DNS fallback for an explicit URI override", async () => {
  await withMockedDatabaseConnection(async () => {
    process.env.NODE_ENV = "development";
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      const error = new Error("querySrv EBADRESP");
      error.code = "EBADRESP";
      throw error;
    };

    await assert.rejects(
      database.connectDB(
        "mongodb+srv://unit-user:unit-secret@proofnestcluster.mongodb.net/proofnest"
      ),
      /MongoDB connection failed/
    );
    assert.equal(connectCalls, 1);
  });
});

test("validates the parsed hostname before allowing the Atlas fallback", async () => {
  await withMockedDatabaseConnection(async () => {
    process.env.NODE_ENV = "development";
    process.env.MONGO_URI =
      "mongodb+srv://proofnestcluster:unit-secret@untrusted.invalid/proofnest";
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      const error = new Error("querySrv EBADRESP");
      error.code = "EBADRESP";
      throw error;
    };

    await assert.rejects(database.connectDB(), /MongoDB connection failed/);
    assert.equal(connectCalls, 1);
  });
});

test("allows the configured Atlas fallback host using mocked connections only", async () => {
  await withMockedDatabaseConnection(async () => {
    process.env.NODE_ENV = "development";
    process.env.MONGO_URI =
      "mongodb+srv://unit-user:unit-secret@proofnestcluster.mongodb.net/proofnest";
    let connectCalls = 0;
    mongoose.connect = async () => {
      connectCalls++;
      if (connectCalls === 1) {
        const error = new Error("querySrv EBADRESP");
        error.code = "EBADRESP";
        throw error;
      }
      mongoose.connection.readyState = 1;
      return mongoose;
    };

    await database.connectDB();
    assert.equal(connectCalls, 2);
  });
});

test("session store configuration honors the per-run collection override", async () => {
  await withMockedDatabaseConnection(async () => {
    const config = getSessionStoreConfig({
      collectionName: "test_verification_sessions_unit_run",
    });

    assert.equal(config.collectionName, "test_verification_sessions_unit_run");
    assert.equal(config.dbName, "proofnest");
    assert.equal(config.mongoUrl, process.env.MONGO_URI);
  });
});
