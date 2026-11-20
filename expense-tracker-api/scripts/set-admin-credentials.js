import dotenv from "dotenv";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/passwords.js";
import { promptHidden, promptText } from "./prompts.js";

dotenv.config();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinimumLength = 12;

try {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expense_tracker");

  const administrator = await User.findOne({ role: "admin" }).select("+passwordHash");
  if (!administrator) {
    throw new Error("No administrator exists. Run `npm run create-admin` first.");
  }

  const email = (await promptText("New admin email: ")).trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    throw new Error("Enter a valid admin email address.");
  }
  if (await User.exists({ email, _id: { $ne: administrator._id } })) {
    throw new Error("That email address is already assigned to another account.");
  }

  const password = await promptHidden("New admin password (12+ characters): ");
  if (password.length < passwordMinimumLength || password.length > 200) {
    throw new Error(`Admin password must be between ${passwordMinimumLength} and 200 characters.`);
  }

  administrator.email = email;
  administrator.passwordHash = await hashPassword(password);
  administrator.status = "active";
  administrator.mustChangePassword = false;
  await administrator.save();
  await Session.deleteMany({ userId: administrator._id });

  console.log("Administrator credentials updated. No credentials were printed.");
} catch (error) {
  console.error("Could not update administrator credentials.", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
