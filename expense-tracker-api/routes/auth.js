import { Router } from "express";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { clearSessionCookie, createSession, getSessionToken, optionalAuth, requireAuth, revokeUserSessions, tokenDigest } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinimumLength = 12;

function publicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    department: user.department,
    jobTitle: user.jobTitle,
    salary: user.salary,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  };
}

function validEmail(value) {
  return typeof value === "string"
    && value.length <= 254
    && emailPattern.test(value.trim());
}

router.post("/register", async (request, response) => {
  const { fullName, email, password, department = "", jobTitle = "" } = request.body || {};
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 100) {
    response.status(400).json({ error: "Full name is required and must be 100 characters or fewer." });
    return;
  }
  if (!validEmail(email)) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (typeof password !== "string" || password.length < passwordMinimumLength || password.length > 200) {
    response.status(400).json({ error: `Password must be between ${passwordMinimumLength} and 200 characters.` });
    return;
  }
  if (typeof department !== "string" || department.trim().length > 100
    || typeof jobTitle !== "string" || jobTitle.trim().length > 100) {
    response.status(400).json({ error: "Department and job title must be 100 characters or fewer." });
    return;
  }

  try {
    await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "user",
      department: department.trim(),
      jobTitle: jobTitle.trim(),
      status: "pending",
    });
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    throw error;
  }
  response.status(201).json({ message: "Your sign-up request was sent to an administrator for approval." });
});

router.post("/login", async (request, response) => {
  const { email, password, role } = request.body || {};
  if (!validEmail(email) || typeof password !== "string" || !password || password.length > 200) {
    response.status(400).json({ error: "Enter your email address and password." });
    return;
  }
  if (!["admin", "user"].includes(role)) {
    response.status(400).json({ error: "Choose an account type." });
    return;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    response.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  if (user.role !== role) {
    response.status(403).json({ error: "This account does not match the selected account type." });
    return;
  }
  if (user.status === "pending") {
    response.status(403).json({ error: "Your account is waiting for administrator approval." });
    return;
  }
  if (user.status !== "active") {
    response.status(403).json({ error: "This account is inactive. Contact an administrator." });
    return;
  }

  await createSession(user, response);
  response.json(publicUser(user));
});

router.get("/me", optionalAuth, (request, response) => {
  response.json(request.user ? publicUser(request.user) : null);
});

router.put("/password", requireAuth, async (request, response) => {
  const { currentPassword, newPassword } = request.body || {};
  if (typeof currentPassword !== "string" || !currentPassword) {
    response.status(400).json({ error: "Enter your current password." });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < passwordMinimumLength || newPassword.length > 200) {
    response.status(400).json({ error: `New password must be between ${passwordMinimumLength} and 200 characters.` });
    return;
  }

  const user = await User.findById(request.user._id).select("+passwordHash");
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    response.status(400).json({ error: "Current password is incorrect." });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  await revokeUserSessions(user._id);
  await createSession(user, response);
  response.json(publicUser(user));
});

router.post("/logout", async (request, response) => {
  const token = getSessionToken(request);
  if (token) {
    await Session.deleteOne({ tokenHash: tokenDigest(token) });
  }
  clearSessionCookie(response);
  response.status(204).end();
});

export default router;
