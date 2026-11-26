/**
 * ProofNest Mongoose Models Barrel Export
 * 
 * Provides centralized access to all database models for the ProofNest application.
 */

const User = require("./User");
const Product = require("./Product");
const Document = require("./Document");
const Repair = require("./Repair");

module.exports = {
  User,
  Product,
  Document,
  Repair,
};

