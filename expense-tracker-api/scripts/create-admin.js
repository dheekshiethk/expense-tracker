import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { hashPassword } from "../utils/passwords.js";
import { promptHidden, promptText } from "./prompts.js";

dotenv.config();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinimumLength = 12;

try {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expense_tracker");
  if (await User.exists({ role: "admin" })) {
    throw new Error("An administrator already exists. This command only creates the first administrator.");
  }

  const fullName = (await promptText("Admin full name: ")).trim();
  const email = (await promptText("Admin email: ")).trim().toLowerCase();

  if (!fullName || fullName.length > 100) {
    throw new Error("Admin name is required and must be 100 characters or fewer.");
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    throw new Error("Enter a valid admin email address.");
  }

  const password = await promptHidden("Admin password (12+ characters): ");
  if (password.length < passwordMinimumLength || password.length > 200) {
    throw new Error(`Admin password must be between ${passwordMinimumLength} and 200 characters.`);
  }

  await User.create({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
    department: "Administration",
    jobTitle: "Administrator",
    status: "active",
  });
  console.log("Created the first administrator account. No credentials were printed.");
} catch (error) {
  console.error("Could not create the administrator account.", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
