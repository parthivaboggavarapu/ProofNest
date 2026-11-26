/**
 * ProofNest Pre-Index Safety & Duplicate Check Utility
 * 
 * Inspects existing data in MongoDB Atlas without deleting or modifying any records.
 * Identifies duplicate keys that would cause unique index creation to fail.
 */

const User = require("../models/User");
const Product = require("../models/Product");

/**
 * Checks for duplicate user emails.
 * @returns {Promise<Array>} List of duplicate email groups
 */
const checkDuplicateUserEmails = async () => {
  const duplicates = await User.aggregate([
    {
      $project: {
        normalizedEmail: { $toLower: { $trim: { input: "$email" } } },
      },
    },
    {
      $group: {
        _id: "$normalizedEmail",
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  return duplicates;
};

/**
 * Checks for duplicate non-empty serial numbers for the same user.
 * Ignores null, empty string, or undefined serial numbers.
 * @returns {Promise<Array>} List of duplicate serial number groups
 */
const checkDuplicateProductSerialNumbers = async () => {
  const duplicates = await Product.aggregate([
    {
      $match: {
        serialNumber: { $type: "string", $gt: "" },
      },
    },
    {
      $group: {
        _id: {
          user: "$user",
          serialNumber: { $trim: { input: "$serialNumber" } },
        },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);

  return duplicates;
};

/**
 * Runs a comprehensive pre-index safety audit.
 * 
 * @returns {Promise<{ isSafe: boolean, emailDuplicates: Array, serialDuplicates: Array }>}
 */
const auditIndexesSafety = async () => {
  console.log("[Database Audit] Inspecting existing collections for unique index conflicts...");

  const [emailDuplicates, serialDuplicates] = await Promise.all([
    checkDuplicateUserEmails(),
    checkDuplicateProductSerialNumbers(),
  ]);

  const isSafe = emailDuplicates.length === 0 && serialDuplicates.length === 0;

  if (!isSafe) {
    if (emailDuplicates.length > 0) {
      console.warn(
        `[Database Audit WARNING] Found ${emailDuplicates.length} duplicate email group(s) in 'users' collection:`
      );
      emailDuplicates.forEach((d) => {
        console.warn(`  - Email: "${d._id}", Count: ${d.count}, Document IDs: [${d.ids.join(", ")}]`);
      });
    }

    if (serialDuplicates.length > 0) {
      console.warn(
        `[Database Audit WARNING] Found ${serialDuplicates.length} duplicate serial number group(s) in 'products' collection:`
      );
      serialDuplicates.forEach((d) => {
        console.warn(
          `  - User: ${d._id.user}, SerialNumber: "${d._id.serialNumber}", Count: ${d.count}, Document IDs: [${d.ids.join(", ")}]`
        );
      });
    }

    console.warn(
      "[Database Audit] Unique indexes were NOT synchronized to prevent collection lock or index build failure. Existing data was preserved."
    );
  } else {
    console.log("[Database Audit] Zero duplicate conflicts detected. Safe to build unique indexes.");
  }

  return {
    isSafe,
    emailDuplicates,
    serialDuplicates,
  };
};

module.exports = {
  checkDuplicateUserEmails,
  checkDuplicateProductSerialNumbers,
  auditIndexesSafety,
};

