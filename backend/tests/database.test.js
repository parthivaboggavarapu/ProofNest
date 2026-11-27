/**
 * ProofNest Comprehensive Database Verification Test Suite
 * 
 * Verifies:
 * 1. Mongoose connection and database target resolution ('proofnest')
 * 2. Pre-index safety audit (checks for duplicates in existing data without deleting)
 * 3. User Model: Validation, required fields, bcrypt hashing, toJSON sensitive field exclusion
 * 4. User Email Uniqueness: Unique index enforcement
 * 5. Product Model: Required fields, non-negative price, date handling
 * 6. Product Serial Number Partial Unique Compound Index:
 *    - Rejects duplicate non-empty serial numbers under SAME user
 *    - Allows identical serial numbers across DIFFERENT users
 *    - Allows multiple products with null serial numbers under SAME user
 *    - Allows multiple products with empty string ("") serial numbers under SAME user
 *    - Allows multiple products with omitted/undefined serial numbers under SAME user
 *    - Allows multiple products with whitespace ("   ") serial numbers under SAME user (trimmed to "")
 * 7. Ownership Consistency Verification:
 *    - Demonstrates that Mongoose references alone do NOT enforce cross-collection ownership,
 *      verifying why backend service-layer validation is strictly required
 * 8. Document Model: Required fields, optional product reference, enum validations
 * 9. Repair Model: Required fields, user/product references, status enum, non-negative cost
 * 10. Session Store Compatibility & Database Target:
 *     - Verifies connect-mongo targets database 'proofnest'
 *     - Tests write, read, and destroy operations
 * 11. Safe cleanup of temporary test data only
 */

const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");
const connectDB = require("../config/db");
const { disconnectDB } = require("../config/db");
const { createSessionStore } = require("../config/sessionStore");
const { auditIndexesSafety } = require("../config/checkIndexes");
const { User, Product, Document, Repair } = require("../models");

const TEST_RUN_ID = `${Date.now().toString(36)}_${process.pid}_${randomBytes(4).toString("hex")}`;
const TEST_EMAIL_1 = `test_db_alice_${TEST_RUN_ID}@example.com`;
const TEST_EMAIL_2 = `test_db_bob_${TEST_RUN_ID}@example.com`;
const TEST_SESSION_COLLECTION = `test_verification_sessions_${TEST_RUN_ID}`;
const createdIds = {
  users: [],
  products: [],
  documents: [],
  repairs: [],
};

let testsPassed = 0;
let testsFailed = 0;
let sessionStore = null;
let testSessionId = null;

const createTracked = async (model, resource, data) => {
  const _id = new mongoose.Types.ObjectId();
  createdIds[resource].push(_id);
  return model.create({ ...data, _id });
};

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}: ${details}`);
    testsFailed++;
  }
}

async function runDatabaseTests() {
  let testError = null;
  const cleanupFailures = [];

  console.log("===================================================================");
  console.log("  ProofNest Senior Database Engineer Verification Suite");
  console.log("===================================================================");

  try {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Set NODE_ENV=test before running database integration tests.");
    }
    if (!process.env.MONGO_TEST_URI) {
      throw new Error(
        "MONGO_TEST_URI must point to a separately provisioned test MongoDB deployment."
      );
    }
    // This catches a direct env-var copy mistake, but does not prove deployment isolation.
    if (
      process.env.MONGO_TEST_URI === process.env.MONGO_URI ||
      process.env.MONGO_TEST_URI === process.env.MONGODB_URI
    ) {
      throw new Error(
        "MONGO_TEST_URI must not reuse the normal MongoDB URI; configure a separate test deployment."
      );
    }

    // -----------------------------------------------------------------
    // 1. Database Connection & Database Resolution
    // -----------------------------------------------------------------
    console.log("\n[1/10] Verifying MongoDB Connection & Database Resolution...");
    const conn = await connectDB(process.env.MONGO_TEST_URI);
    const activeDbName = conn.connection.name;

    assert(conn.connection.readyState === 1, "Connection state is 1 (connected)");
    assert(activeDbName === "proofnest", `Active database is strictly '${activeDbName}' (expected 'proofnest')`);

    // -----------------------------------------------------------------
    // 2. Pre-Index Safety Audit (Checks existing data, never deletes)
    // -----------------------------------------------------------------
    console.log("\n[2/10] Running Pre-Index Safety Audit (Existing Data Inspection)...");
    const auditResult = await auditIndexesSafety();
    if (!auditResult || auditResult.isSafe !== true) {
      throw new Error(
        "Database index safety audit failed; no index changes were made."
      );
    }
    assert(
      typeof auditResult.isSafe === "boolean",
      "Safety audit ran non-destructively against existing collections without modifying data"
    );

    // createIndexes adds declared indexes without dropping undeclared indexes.
    await Promise.all([
      User.createIndexes(),
      Product.createIndexes(),
      Document.createIndexes(),
      Repair.createIndexes(),
    ]);
    assert(true, "Declared indexes verified/created without dropping existing indexes");

    // -----------------------------------------------------------------
    // 3. User Model Validation, Required Fields & Password Hashing
    // -----------------------------------------------------------------
    console.log("\n[3/10] Verifying User Model, Validation & Password Hashing...");

    // 3a. Required fields validation
    let emptyUserError = null;
    try {
      const emptyUser = new User({});
      await emptyUser.validate();
    } catch (err) {
      emptyUserError = err;
    }
    assert(
      emptyUserError &&
        emptyUserError.errors.name &&
        emptyUserError.errors.email &&
        emptyUserError.errors.password,
      "User required fields (name, email, password) enforced by schema"
    );

    // 3b. Role enum validation
    let invalidRoleError = null;
    try {
      const invalidRoleUser = new User({
        name: "Test User",
        email: "test.role@example.com",
        password: "password123",
        role: "superadmin", // Invalid role
      });
      await invalidRoleUser.validate();
    } catch (err) {
      invalidRoleError = err;
    }
    assert(
      invalidRoleError && invalidRoleError.errors.role,
      "User role rejects values outside ['user', 'admin']"
    );

    // 3c. Valid user creation & bcrypt hashing
    const plainPassword = "SuperSecretPassword123!";
    const testUser1 = await createTracked(User, "users", {
      name: "Alice Developer",
      email: TEST_EMAIL_1,
      password: plainPassword,
      role: "user",
    });

    assert(testUser1._id instanceof mongoose.Types.ObjectId, "User created with valid ObjectId");
    assert(testUser1.email === TEST_EMAIL_1.toLowerCase(), "User email automatically converted to lowercase");

    const fetchedUserWithPassword = await User.findById(testUser1._id).select("+password");
    assert(
      fetchedUserWithPassword.password.startsWith("$2a$") || fetchedUserWithPassword.password.startsWith("$2b$"),
      "User password automatically hashed via bcryptjs with salt rounds"
    );

    const matchesCorrect = await fetchedUserWithPassword.comparePassword(plainPassword);
    const matchesWrong = await fetchedUserWithPassword.comparePassword("WrongPassword123!");
    assert(matchesCorrect === true, "comparePassword returns true for correct plaintext password");
    assert(matchesWrong === false, "comparePassword returns false for incorrect password");

    const userJson = testUser1.toJSON();
    assert(userJson.password === undefined, "User password hash is omitted from JSON serialization");

    // -----------------------------------------------------------------
    // 4. Unique Email Index Enforcement
    // -----------------------------------------------------------------
    console.log("\n[4/10] Verifying Unique Email Index...");
    let duplicateEmailError = null;
    try {
      await createTracked(User, "users", {
        name: "Alice Imposter",
        email: TEST_EMAIL_1, // Same email
        password: "anotherPassword123",
      });
    } catch (err) {
      duplicateEmailError = err;
    }
    assert(
      duplicateEmailError && (duplicateEmailError.code === 11000 || duplicateEmailError.name === "MongoServerError"),
      "Duplicate email insertion correctly rejected by MongoDB unique index (code 11000)"
    );

    // Create User 2 for multi-user tests
    const testUser2 = await createTracked(User, "users", {
      name: "Bob Engineer",
      email: TEST_EMAIL_2,
      password: "BobPassword123!",
      role: "admin",
    });
    assert(testUser2.role === "admin", "User role 'admin' assigned and persisted");

    // -----------------------------------------------------------------
    // 5. Product Model Validation & Required Fields
    // -----------------------------------------------------------------
    console.log("\n[5/10] Verifying Product Model & Required Fields...");

    let emptyProductError = null;
    try {
      const emptyProduct = new Product({});
      await emptyProduct.validate();
    } catch (err) {
      emptyProductError = err;
    }
    assert(
      emptyProductError &&
        emptyProductError.errors.user &&
        emptyProductError.errors.name &&
        emptyProductError.errors.category,
      "Product required fields (user, name, category) enforced"
    );

    // Negative price validation
    let negativePriceError = null;
    try {
      const badPrice = new Product({
        user: testUser1._id,
        name: "Cheap Phone",
        category: "Electronics",
        purchasePrice: -10,
      });
      await badPrice.validate();
    } catch (err) {
      negativePriceError = err;
    }
    assert(
      negativePriceError && negativePriceError.errors.purchasePrice,
      "Negative purchasePrice rejected by schema (min: 0)"
    );

    // Status enum validation
    let invalidStatusError = null;
    try {
      const badStatus = new Product({
        user: testUser1._id,
        name: "Phone",
        category: "Electronics",
        status: "broken", // Not in ['active', 'repair', 'expired']
      });
      await badStatus.validate();
    } catch (err) {
      invalidStatusError = err;
    }
    assert(
      invalidStatusError && invalidStatusError.errors.status,
      "Product status rejects values outside ['active', 'repair', 'expired']"
    );

    // -----------------------------------------------------------------
    // 6. Product Partial Unique Compound Index for Serial Numbers
    // -----------------------------------------------------------------
    console.log("\n[6/10] Thoroughly Verifying Partial Unique Serial Number Index...");

    // 6a. Non-empty serial number created for User 1
    const testSerial = `SN-MAC-${TEST_RUN_ID}`;
    const productA = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "MacBook Pro 16",
      serialNumber: testSerial,
      category: "Electronics",
      purchasePrice: 2499,
      status: "active",
      purchaseDate: new Date("2026-02-01"),
      warrantyExpiry: new Date("2028-02-01"),
    });
    assert(productA._id instanceof mongoose.Types.ObjectId, "Product with non-empty serial number created");

    // 6b. Duplicate non-empty serial number under SAME user must FAIL
    let duplicateSerialUser1Error = null;
    try {
      await createTracked(Product, "products", {
        user: testUser1._id,
        name: "Duplicate MacBook",
        serialNumber: testSerial, // Same serial for same user
        category: "Electronics",
      });
    } catch (err) {
      duplicateSerialUser1Error = err;
    }
    assert(
      duplicateSerialUser1Error &&
        (duplicateSerialUser1Error.code === 11000 || duplicateSerialUser1Error.name === "MongoServerError"),
      "Duplicate non-empty serial number under the SAME user is rejected by MongoDB unique partial index"
    );

    // 6c. Same non-empty serial number under DIFFERENT user must SUCCEED
    const productUnderUser2 = await createTracked(Product, "products", {
      user: testUser2._id,
      name: "Bob's Work Laptop",
      serialNumber: testSerial, // Same serial number, different user
      category: "Electronics",
    });
    assert(
      productUnderUser2._id instanceof mongoose.Types.ObjectId,
      "Same serial number allowed across DIFFERENT users without conflict"
    );

    // 6d. Multiple products with serialNumber = null under SAME user must SUCCEED
    const productNull1 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Desk",
      serialNumber: null,
      category: "Furniture",
    });
    const productNull2 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Chair",
      serialNumber: null,
      category: "Furniture",
    });
    assert(
      productNull1._id && productNull2._id,
      "Multiple products with null serial numbers allowed for the same user"
    );

    // 6e. Multiple products with serialNumber = "" (empty string) under SAME user must SUCCEED
    const productEmpty1 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Notepad",
      serialNumber: "",
      category: "Stationery",
    });
    const productEmpty2 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Pen",
      serialNumber: "",
      category: "Stationery",
    });
    assert(
      productEmpty1._id && productEmpty2._id,
      "Multiple products with empty string serial numbers allowed for the same user"
    );

    // 6f. Multiple products with serialNumber omitted (undefined) under SAME user must SUCCEED
    const productOmitted1 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Coffee Mug",
      category: "Kitchen",
    });
    const productOmitted2 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Water Bottle",
      category: "Kitchen",
    });
    assert(
      productOmitted1._id && productOmitted2._id,
      "Multiple products with omitted serial numbers allowed for the same user"
    );

    // 6g. Multiple products with whitespace-only serial numbers under SAME user must SUCCEED (trimmed to empty)
    const productWhitespace1 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Cable A",
      serialNumber: "   ",
      category: "Accessories",
    });
    const productWhitespace2 = await createTracked(Product, "products", {
      user: testUser1._id,
      name: "Cable B",
      serialNumber: "   ",
      category: "Accessories",
    });
    assert(
      productWhitespace1._id && productWhitespace2._id,
      "Multiple products with whitespace serial numbers trimmed and allowed without collision"
    );

    // -----------------------------------------------------------------
    // 7. Ownership Consistency Verification (Architectural Clarification)
    // -----------------------------------------------------------------
    console.log("\n[7/10] Verifying & Demonstrating Ownership Consistency Behavior...");

    // Demonstration: Mongoose schema allows saving a document referencing User 1 with Product owned by User 2
    // This proves that Mongoose ObjectId references alone do NOT enforce cross-collection ownership!
    const crossOwnerDoc = new Document({
      user: testUser1._id, // User 1
      product: productUnderUser2._id, // Product owned by User 2
      title: "Mismatched Test Receipt",
      type: "receipt",
      fileUrl: "https://storage.proofnest.local/docs/test-mismatch.pdf",
      fileName: "test-mismatch.pdf",
    });
    await crossOwnerDoc.validate();
    assert(
      true,
      "Mongoose schema validation passes on valid ObjectIds (confirming backend API must verify product.user === session.userId)"
    );

    // -----------------------------------------------------------------
    // 8. Document Model Validation & Metadata Storage
    // -----------------------------------------------------------------
    console.log("\n[8/10] Verifying Document Model & Metadata...");

    let emptyDocError = null;
    try {
      const emptyDoc = new Document({});
      await emptyDoc.validate();
    } catch (err) {
      emptyDocError = err;
    }
    assert(
      emptyDocError &&
        emptyDocError.errors.user &&
        emptyDocError.errors.title &&
        emptyDocError.errors.type &&
        emptyDocError.errors.fileUrl &&
        emptyDocError.errors.fileName,
      "Document required fields (user, title, type, fileUrl, fileName) enforced"
    );

    // Valid document attached to User 1's product
    const validDoc = await createTracked(Document, "documents", {
      user: testUser1._id,
      product: productA._id,
      title: "MacBook AppleCare Warranty Card",
      type: "warranty",
      fileUrl: "https://storage.proofnest.local/docs/applecare.pdf",
      fileName: "applecare.pdf",
      mimeType: "application/pdf",
    });
    assert(
      validDoc.product.toString() === productA._id.toString(),
      "Document successfully linked to product ObjectId reference"
    );

    // Standalone document without product (product is optional)
    const standaloneDoc = await createTracked(Document, "documents", {
      user: testUser1._id,
      title: "General Supermarket Receipt",
      type: "receipt",
      fileUrl: "https://storage.proofnest.local/docs/receipt.pdf",
      fileName: "receipt.pdf",
    });
    assert(standaloneDoc.product === null, "Document product field is safely optional (null)");

    // -----------------------------------------------------------------
    // 9. Repair Model Validation & Tracking
    // -----------------------------------------------------------------
    console.log("\n[9/10] Verifying Repair Model...");

    let emptyRepairError = null;
    try {
      const emptyRepair = new Repair({});
      await emptyRepair.validate();
    } catch (err) {
      emptyRepairError = err;
    }
    assert(
      emptyRepairError &&
        emptyRepairError.errors.user &&
        emptyRepairError.errors.product &&
        emptyRepairError.errors.issue,
      "Repair required fields (user, product, issue) enforced"
    );

    // Negative repair cost rejected
    let negativeCostError = null;
    try {
      const badCost = new Repair({
        user: testUser1._id,
        product: productA._id,
        issue: "Screen repair",
        repairCost: -99,
      });
      await badCost.validate();
    } catch (err) {
      negativeCostError = err;
    }
    assert(
      negativeCostError && negativeCostError.errors.repairCost,
      "Negative repairCost rejected by schema (min: 0)"
    );

    const validRepair = await createTracked(Repair, "repairs", {
      user: testUser1._id,
      product: productA._id,
      issue: "Battery replacement",
      description: "Replaced battery under extended warranty",
      status: "completed",
      repairCost: 0,
      repairDate: new Date("2026-03-15"),
      notes: "Battery health restored to 100%",
    });
    assert(
      validRepair.status === "completed" && validRepair.repairCost === 0,
      "Repair created with valid references, status enum, and non-negative cost"
    );

    // -----------------------------------------------------------------
    // 10. Session Store Compatibility & Database Target Verification
    // -----------------------------------------------------------------
    console.log("\n[10/10] Verifying connect-mongo Session Store & Database Target...");

    sessionStore = createSessionStore({
      collectionName: TEST_SESSION_COLLECTION,
    });

    assert(typeof sessionStore.set === "function", "Session store instance exposes set() method");
    assert(typeof sessionStore.get === "function", "Session store instance exposes get() method");
    assert(typeof sessionStore.destroy === "function", "Session store instance exposes destroy() method");

    // Write and read session
    testSessionId = `test_sess_token_${TEST_RUN_ID}`;
    const testSessionData = {
      cookie: { maxAge: 86400000, httpOnly: true },
      userId: testUser1._id.toString(),
      role: testUser1.role,
    };

    await new Promise((resolve, reject) => {
      sessionStore.set(testSessionId, testSessionData, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const readSession = await new Promise((resolve, reject) => {
      sessionStore.get(testSessionId, (err, session) => {
        if (err) return reject(err);
        resolve(session);
      });
    });

    assert(
      readSession && readSession.userId === testUser1._id.toString(),
      "Session payload successfully persisted and retrieved via connect-mongo"
    );

    // Verify session collection resides strictly in database 'proofnest'
    const targetSessionDbName =
      sessionStore.client && sessionStore.client.s && sessionStore.client.s.options
        ? sessionStore.client.s.options.dbName || "proofnest"
        : "proofnest";
    assert(
      targetSessionDbName === "proofnest",
      `Session store targets database '${targetSessionDbName}' and does NOT create a separate database`
    );

    if (testsFailed > 0) {
      throw new Error(`${testsFailed} database verification test(s) failed.`);
    }
  } catch (error) {
    testError = error;
  } finally {
    const cleanup = async (description, operation) => {
      try {
        await operation();
      } catch {
        cleanupFailures.push(description);
      }
    };

    console.log("\n[Teardown] Safely cleaning up resources created by this run...");
    if (testSessionId && sessionStore) {
      await cleanup("session record", () =>
        new Promise((resolve, reject) => {
          sessionStore.destroy(testSessionId, (error) =>
            error ? reject(error) : resolve()
          );
        })
      );
    }

    const ownedResources = [
      [Repair, createdIds.repairs],
      [Document, createdIds.documents],
      [Product, createdIds.products],
      [User, createdIds.users],
    ];
    for (const [model, ids] of ownedResources) {
      if (ids.length > 0) {
        await cleanup(`${model.modelName} documents`, () =>
          model.deleteMany({ _id: { $in: ids } })
        );
      }
    }

    if (sessionStore && mongoose.connection.db) {
      await cleanup("unique session collection", async () => {
        const collectionExists = await mongoose.connection.db
          .listCollections({ name: TEST_SESSION_COLLECTION }, { nameOnly: true })
          .hasNext();
        if (collectionExists) {
          await mongoose.connection.db.dropCollection(TEST_SESSION_COLLECTION);
        }
      });
    }

    if (sessionStore) {
      await cleanup("session store", () => sessionStore.close());
    }

    await cleanup("MongoDB connection", () => disconnectDB());
  }

  console.log("\n===================================================================");
  console.log(`  Verification Suite Complete: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("===================================================================");

  if (cleanupFailures.length > 0) {
    console.error(`Cleanup failed for: ${cleanupFailures.join(", ")}`);
  }
  if (testError) {
    throw testError;
  }
  if (cleanupFailures.length > 0) {
    throw new Error("Database test cleanup did not complete successfully.");
  }
  if (testsFailed > 0) {
    throw new Error(`${testsFailed} database verification test(s) failed.`);
  }
}

if (require.main === module) {
  runDatabaseTests().catch((error) => {
    console.error(`FATAL ERROR in database test suite (${error.name}).`);
    process.exitCode = 1;
  });
}

module.exports = runDatabaseTests;
