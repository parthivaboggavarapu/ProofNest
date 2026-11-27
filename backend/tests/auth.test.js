const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { Store } = require("express-session");
const bcrypt = require("bcryptjs");
const createApp = require("../app");
const { createAuthController } = require("../controllers/authController");
const { requireRole } = require("../middleware/auth");
const User = require("../models/User");

const config = {
  NODE_ENV: "test",
  PORT: 4000,
  MONGO_URI: "mongodb://auth-test.invalid/proofnest",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_SECRET: "auth-test-session-secret-with-at-least-32-chars",
  TRUST_PROXY: 0,
};

class TestSessionStore extends Store {
  constructor() {
    super();
    this.sessions = new Map();
  }

  get(sessionId, callback) {
    const stored = this.sessions.get(sessionId);
    callback(null, stored ? JSON.parse(JSON.stringify(stored)) : null);
  }

  set(sessionId, sessionData, callback) {
    this.sessions.set(sessionId, JSON.parse(JSON.stringify(sessionData)));
    if (callback) callback(null);
  }

  destroy(sessionId, callback) {
    this.sessions.delete(sessionId);
    if (callback) callback(null);
  }

  touch(sessionId, sessionData, callback) {
    this.set(sessionId, sessionData, callback);
  }
}

const createFakeUserModel = () => {
  const usersByEmail = new Map();
  const usersById = new Map();
  let nextId = 1;

  return {
    usersByEmail,
    async create(data) {
      if (usersByEmail.has(data.email)) {
        const error = new Error("duplicate key");
        error.code = 11000;
        throw error;
      }

      const passwordHash = `test-hash:${data.password}`;
      const user = {
        _id: String(nextId++),
        name: data.name,
        email: data.email,
        role: data.role || "user",
        comparePassword: async (candidate) =>
          passwordHash === `test-hash:${candidate}`,
      };
      usersByEmail.set(user.email, user);
      usersById.set(user._id, user);
      return user;
    },
    findOne({ email }) {
      return {
        select: async () => usersByEmail.get(email) || null,
      };
    },
    async findById(id) {
      return usersById.get(String(id)) || null;
    },
  };
};

const createAuthTestContext = (options = {}) => {
  const UserModel = createFakeUserModel();
  const sessionStore = options.sessionStore || new TestSessionStore();
  const app = createApp(
    { ...config, ...(options.config || {}) },
    {
      UserModel,
      sessionStoreFactory: () => sessionStore,
    }
  );
  return { app, UserModel, sessionStore };
};

test("new User documents hash passwords at bcrypt cost 12", async () => {
  const user = new User({
    name: "Test User",
    email: "hash-test@example.com",
    password: "CorrectPassword123!",
  });

  await User.schema.s.hooks.execPre("save", user, []);

  assert.notEqual(user.password, "CorrectPassword123!");
  assert.equal(bcrypt.getRounds(user.password), 12);
  assert.equal(await user.comparePassword("CorrectPassword123!"), true);
  assert.equal(await user.comparePassword("WrongPassword123!"), false);
});

test("User.hashPassword generates bcrypt hashes at cost 12", async () => {
  const passwordHash = await User.hashPassword("CorrectPassword123!");

  assert.equal(bcrypt.getRounds(passwordHash), 12);
  const user = new User({
    name: "Test User",
    email: "hash-helper-test@example.com",
    password: passwordHash,
  });
  assert.equal(await user.comparePassword("CorrectPassword123!"), true);
  assert.equal(await user.comparePassword("WrongPassword123!"), false);
});

const request = async (
  app,
  { method = "GET", path = "/", body, cookie, origin, headers: extraHeaders = {} } = {}
) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    return await new Promise((resolve, reject) => {
      const headers = { ...extraHeaders };
      if (body !== undefined) {
        headers["content-type"] = "application/json";
      }
      if (cookie) {
        headers.cookie = cookie;
      }
      if (origin !== undefined) {
        headers.origin = origin;
      }

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
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

const payloadOf = (response) => JSON.parse(response.body);
const sessionCookieFrom = (response) =>
  response.headers["set-cookie"]?.[0]?.split(";")[0];
const registerUser = (app, overrides = {}, requestOptions = {}) =>
  request(app, {
    ...requestOptions,
    method: "POST",
    path: "/api/auth/register",
    body: {
      name: "Avery Example",
      email: "avery@example.com",
      password: "passphrase123",
      ...overrides,
    },
  });
const loginUser = (app, overrides = {}) =>
  request(app, {
    method: "POST",
    path: "/api/auth/login",
    body: {
      email: "avery@example.com",
      password: "passphrase123",
      ...overrides,
    },
  });

test("registers a normalized user with the default role and a safe response", async () => {
  const { app, UserModel } = createAuthTestContext();
  const response = await registerUser(app, {
    name: "  Avery Example  ",
    email: "  AVERY@EXAMPLE.COM ",
    role: "admin",
  });
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 201);
  assert.equal(payload.data.user.name, "Avery Example");
  assert.equal(payload.data.user.email, "avery@example.com");
  assert.equal(payload.data.user.role, "user");
  assert.equal(Object.hasOwn(payload.data.user, "password"), false);
  assert.equal(response.body.includes("test-hash:"), false);
  assert.equal(UserModel.usersByEmail.get("avery@example.com").role, "user");
});

test("rejects duplicate email registration", async () => {
  const { app } = createAuthTestContext();
  await registerUser(app);
  const response = await registerUser(app);
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 409);
  assert.equal(payload.error.code, "EMAIL_ALREADY_EXISTS");
});

test("rejects invalid registration data before creating a user", async () => {
  const { app, UserModel } = createAuthTestContext();
  const response = await registerUser(app, {
    name: " ",
    email: "not-an-email",
    password: "123",
  });
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 422);
  assert.equal(payload.error.code, "VALIDATION_ERROR");
  assert.equal(UserModel.usersByEmail.size, 0);
});

test("rejects passwords that exceed bcrypt's 72-byte input limit", async () => {
  const { app, UserModel } = createAuthTestContext();
  const response = await registerUser(app, {
    password: "p".repeat(73),
  });

  assert.equal(response.statusCode, 422);
  assert.equal(UserModel.usersByEmail.size, 0);
});

test("logs in successfully and issues an HTTP-only session cookie", async () => {
  const { app } = createAuthTestContext();
  await registerUser(app);
  const response = await loginUser(app);
  const payload = payloadOf(response);
  const cookie = response.headers["set-cookie"]?.[0] || "";

  assert.equal(response.statusCode, 200);
  assert.equal(payload.data.user.email, "avery@example.com");
  assert.equal(Object.hasOwn(payload.data.user, "password"), false);
  assert.equal(response.body.includes("test-hash:"), false);
  assert.match(cookie, /^proofnest\.sid=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.doesNotMatch(cookie, /; Secure/i);
});

test("regenerates the session before saving the authenticated user ID", async () => {
  const UserModel = createFakeUserModel();
  await UserModel.create({
    name: "Avery Example",
    email: "avery@example.com",
    password: "passphrase123",
  });
  const controller = createAuthController(UserModel);
  const operations = [];
  const req = {
    validatedBody: {
      email: "avery@example.com",
      password: "passphrase123",
    },
    session: {
      regenerate(callback) {
        operations.push("regenerate");
        req.session = {
          save(saveCallback) {
            operations.push("save");
            saveCallback(null);
          },
        };
        callback(null);
      },
    },
  };
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

  await controller.login(req, res);

  assert.deepEqual(operations, ["regenerate", "save"]);
  assert.equal(req.session.userId, "1");
  assert.equal(res.statusCode, 200);
});

test("maps session persistence failures to a safe service error", async () => {
  const UserModel = createFakeUserModel();
  await UserModel.create({
    name: "Avery Example",
    email: "avery@example.com",
    password: "passphrase123",
  });
  const controller = createAuthController(UserModel);
  const req = {
    validatedBody: {
      email: "avery@example.com",
      password: "passphrase123",
    },
    session: {
      regenerate(callback) {
        callback(null);
      },
      save(callback) {
        callback(new Error("sensitive store failure"));
      },
    },
  };
  const res = { status() { return this; }, json() {} };

  await assert.rejects(
    controller.login(req, res),
    (error) =>
      error.statusCode === 503 &&
      error.code === "SESSION_STORE_ERROR" &&
      !error.message.includes("sensitive store failure")
  );
});

test("uses the same generic response for incorrect passwords and missing accounts", async () => {
  const { app } = createAuthTestContext();
  await registerUser(app);
  const wrongPassword = await loginUser(app, { password: "wrong-password" });
  const missingAccount = await loginUser(app, {
    email: "missing@example.com",
  });
  const wrongPayload = payloadOf(wrongPassword);
  const missingPayload = payloadOf(missingAccount);

  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(missingAccount.statusCode, 401);
  assert.deepEqual(wrongPayload.error, missingPayload.error);
  assert.equal(wrongPayload.error.code, "INVALID_CREDENTIALS");
});

test("protects /me and persists the authenticated session across requests", async () => {
  const { app } = createAuthTestContext();
  const unauthenticated = await request(app, { path: "/api/auth/me" });
  await registerUser(app);
  const login = await loginUser(app);
  const cookie = sessionCookieFrom(login);
  const authenticated = await request(app, {
    path: "/api/auth/me",
    cookie,
  });
  const payload = payloadOf(authenticated);

  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(authenticated.statusCode, 200);
  assert.equal(payload.data.user.email, "avery@example.com");
  assert.equal(Object.hasOwn(payload.data.user, "password"), false);
  assert.equal(authenticated.body.includes("test-hash:"), false);
});

test("logs out and invalidates the server-side session", async () => {
  const { app, sessionStore } = createAuthTestContext();
  await registerUser(app);
  const login = await loginUser(app);
  const cookie = sessionCookieFrom(login);
  assert.ok(cookie);

  const logout = await request(app, {
    method: "POST",
    path: "/api/auth/logout",
    cookie,
    origin: config.FRONTEND_URL,
  });
  const afterLogout = await request(app, {
    path: "/api/auth/me",
    cookie,
  });

  assert.equal(logout.statusCode, 200);
  assert.match(logout.headers["set-cookie"][0], /^proofnest\.sid=; Path=\//);
  assert.match(logout.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  assert.match(logout.headers["set-cookie"][0], /HttpOnly/i);
  assert.match(logout.headers["set-cookie"][0], /SameSite=Lax/i);
  assert.doesNotMatch(logout.headers["set-cookie"][0], /; Secure/i);
  assert.equal(afterLogout.statusCode, 401);
  assert.equal(sessionStore.sessions.size, 0);
});

test("sets secure cross-site session cookies in production", () => {
  const context = createAuthTestContext({
    config: { NODE_ENV: "production" },
  });

  assert.equal(context.app.locals.sessionCookieOptions.secure, true);
  assert.equal(context.app.locals.sessionCookieOptions.httpOnly, true);
  assert.equal(context.app.locals.sessionCookieOptions.sameSite, "none");
});

test("role middleware rejects unauthenticated and unauthorized requests", () => {
  const requireAdmin = requireRole("admin");
  let unauthenticatedError;
  let unauthorizedError;
  let allowed = false;

  requireAdmin({}, {}, (error) => {
    unauthenticatedError = error;
  });
  requireAdmin({ user: { role: "user" } }, {}, (error) => {
    unauthorizedError = error;
  });
  requireAdmin({ user: { role: "admin" } }, {}, (error) => {
    allowed = error === undefined;
  });

  assert.equal(unauthenticatedError.statusCode, 401);
  assert.equal(unauthorizedError.statusCode, 403);
  assert.equal(allowed, true);
});

test("allows a trusted Origin on a state-changing request and matches CORS", async () => {
  const { app } = createAuthTestContext();
  const response = await registerUser(app, {}, { origin: config.FRONTEND_URL });

  assert.equal(response.statusCode, 201);
  assert.equal(
    response.headers["access-control-allow-origin"],
    config.FRONTEND_URL
  );
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});

test("CORS preflight permits the trusted frontend to submit JSON mutations", async () => {
  const { app } = createAuthTestContext();
  const response = await request(app, {
    method: "OPTIONS",
    path: "/api/auth/register",
    origin: config.FRONTEND_URL,
    headers: {
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(
    response.headers["access-control-allow-origin"],
    config.FRONTEND_URL
  );
  assert.match(response.headers["access-control-allow-methods"], /POST/);
  assert.match(response.headers["access-control-allow-credentials"], /true/);
});

test("rejects an untrusted Origin on a state-changing request", async () => {
  const { app } = createAuthTestContext();
  const response = await registerUser(app, {}, {
    origin: "https://untrusted.example",
  });
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 403);
  assert.equal(payload.error.code, "CSRF_ORIGIN_FORBIDDEN");
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("allows originless JSON API clients without browser Fetch Metadata", async () => {
  const { app } = createAuthTestContext();
  const response = await registerUser(app);

  assert.equal(response.statusCode, 201);
});

test("rejects originless state-changing requests with browser Fetch Metadata", async () => {
  const { app } = createAuthTestContext();
  const response = await registerUser(app, {}, {
    headers: { "sec-fetch-site": "cross-site" },
  });
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 403);
  assert.equal(payload.error.code, "CSRF_ORIGIN_REQUIRED");
});

test("rejects originless state-changing requests carrying the session cookie", async () => {
  const { app } = createAuthTestContext();
  const response = await registerUser(app, {}, {
    headers: { cookie: "proofnest.sid=test-session" },
  });
  const payload = payloadOf(response);

  assert.equal(response.statusCode, 403);
  assert.equal(payload.error.code, "CSRF_ORIGIN_REQUIRED");
});

test("checks trusted origins for POST, PUT, PATCH, and DELETE requests", async () => {
  const { app } = createAuthTestContext();

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const trusted = await request(app, {
      method,
      path: "/api/not-implemented",
      origin: config.FRONTEND_URL,
    });
    const untrusted = await request(app, {
      method,
      path: "/api/not-implemented",
      origin: "https://untrusted.example",
    });

    assert.equal(trusted.statusCode, 404, `${method} trusted Origin reaches routing`);
    assert.equal(untrusted.statusCode, 403, `${method} untrusted Origin is rejected`);
  }
});
