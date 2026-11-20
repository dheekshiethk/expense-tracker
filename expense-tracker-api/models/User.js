import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    department: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    jobTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    salary: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "pending", "inactive"],
      default: "pending",
      required: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
