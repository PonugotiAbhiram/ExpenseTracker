const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Please provide a valid email address",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never return password in queries by default
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ createdAt: -1 });

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Hash password only when it's new or modified */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

/** Prevent querying inactive users by default */
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeInactive) {
    this.where({ isActive: true });
  }
});

// ─── Instance Methods ────────────────────────────────────────────────────────

/** Verify a plain-text password against the stored hash */
userSchema.methods.matchPassword = async function (enteredPassword) {
  // password has select:false, so re-fetch it if not present
  const password = this.password ?? (await User.findById(this._id).select("+password")).password;
  return bcrypt.compare(enteredPassword, password);
};

/** Record the last successful login timestamp */
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save({ validateModifiedOnly: true });
};

/** Soft-delete instead of removing the document */
userSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save({ validateModifiedOnly: true });
};

/** Check if password was changed after a given JWT timestamp */
userSchema.methods.passwordChangedAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  return this.passwordChangedAt.getTime() / 1000 > jwtTimestamp;
};

// ─── Static Methods ──────────────────────────────────────────────────────────

/** Find a user by email and include the password field for auth flows */
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select("+password");
  if (!user) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");

  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;