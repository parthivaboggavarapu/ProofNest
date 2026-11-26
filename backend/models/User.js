/**
 * ProofNest User Model
 * 
 * Represents an authenticated user in ProofNest.
 * Supports session-based authentication and secure password hashing via bcryptjs.
 * 
 * CRITICAL BEHAVIOR NOTICE FOR BACKEND DEVELOPERS:
 * The password hashing hook below is a pre('save') hook. It executes ONLY during
 * document operations: `user.save()` or `User.create()`.
 * 
 * Query-level update operations (such as `User.findByIdAndUpdate()`, `User.updateOne()`,
 * or `User.updateMany()`) BYPASS Mongoose document middleware and WILL NOT trigger this hook.
 * 
 * When implementing password change or reset routines, you MUST either:
 *   Option A (Recommended): Fetch document, assign new password, and call .save():
 *     const user = await User.findById(userId).select('+password');
 *     user.password = newPassword;
 *     await user.save();
 * 
 *   Option B: Explicitly hash the password before running an update query:
 *     const hashedPassword = await User.hashPassword(newPassword);
 *     await User.findByIdAndUpdate(userId, { password: hashedPassword });
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Prevents password hash from being included in query results by default
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be either 'user' or 'admin'",
      },
      default: "user",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save hook: Hash password with bcryptjs before persisting to database.
 * Async pre-save hook (executes on user.save() or User.create()).
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compare candidate password with stored bcrypt hash.
 * 
 * @param {string} candidatePassword - Plaintext password to test
 * @returns {Promise<boolean>} True if match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error(
      "Password field is not selected on User document. Query with .select('+password') to compare passwords."
    );
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Alias for flexibility with various controller conventions
userSchema.methods.matchPassword = userSchema.methods.comparePassword;

/**
 * Static helper for explicit password hashing when direct query updates are used
 * (e.g. User.findByIdAndUpdate which bypasses pre('save') hooks).
 * 
 * @param {string} plainPassword 
 * @returns {Promise<string>} Bcrypt password hash
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
