import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { requireRole, revokeUserSessions } from "../middleware/auth.js";
import { generateTemporaryPassword, hashPassword } from "../utils/passwords.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function parseSalary(value) {
  if (value === "" || value === null || value === undefined) return null;
  const salary = Number(value);
  return Number.isFinite(salary) && salary >= 0 ? salary : undefined;
}

router.use(requireRole("admin"));

router.get("/", async (_request, response) => {
  const users = await User.find({ role: "user" })
    .select("fullName email role department jobTitle salary status mustChangePassword")
    .sort({ fullName: 1 });
  response.json(users.map(publicUser));
});

router.post("/", async (request, response) => {
  const { fullName, email, password, department = "", jobTitle = "" } = request.body || {};
  const salary = parseSalary(request.body?.salary);
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 100) {
    response.status(400).json({ error: "Full name is required and must be 100 characters or fewer." });
    return;
  }
  if (typeof email !== "string" || email.length > 254 || !emailPattern.test(email.trim())) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 200) {
    response.status(400).json({ error: "Password must be between 12 and 200 characters." });
    return;
  }
  if (typeof department !== "string" || department.trim().length > 100
    || typeof jobTitle !== "string" || jobTitle.trim().length > 100) {
    response.status(400).json({ error: "Department and job title must be 100 characters or fewer." });
    return;
  }
  if (salary === undefined) {
    response.status(400).json({ error: "Salary must be a non-negative number." });
    return;
  }

  try {
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "user",
      department: department.trim(),
      jobTitle: jobTitle.trim(),
      salary,
      status: "active",
      mustChangePassword: false,
    });
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    throw error;
  }
});

router.put("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const { fullName, department, jobTitle, password } = request.body || {};
  const salary = parseSalary(request.body?.salary);
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 100) {
    response.status(400).json({ error: "Full name is required and must be 100 characters or fewer." });
    return;
  }
  if (typeof department !== "string" || department.trim().length > 100
    || typeof jobTitle !== "string" || jobTitle.trim().length > 100) {
    response.status(400).json({ error: "Department and job title must be 100 characters or fewer." });
    return;
  }
  if (salary === undefined) {
    response.status(400).json({ error: "Salary must be a non-negative number." });
    return;
  }

  if (password !== undefined && password !== ""
    && (typeof password !== "string" || password.length < 12 || password.length > 200)) {
    response.status(400).json({ error: "Password must be between 12 and 200 characters." });
    return;
  }

  const updates = {
    fullName: fullName.trim(),
    department: department.trim(),
    jobTitle: jobTitle.trim(),
    salary,
  };
  if (password) {
    updates.passwordHash = await hashPassword(password);
    updates.mustChangePassword = false;
  }

  const user = await User.findOneAndUpdate(
    { _id: request.params.id, role: "user" },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!user) {
    response.status(404).json({ error: "Employee not found." });
    return;
  }
  if (password) await revokeUserSessions(user._id);
  response.json(publicUser(user));
});

router.post("/:id/approve", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await User.findOneAndUpdate(
    { _id: request.params.id, role: "user", status: "pending" },
    { $set: { status: "active" } },
    { new: true, runValidators: true },
  );
  if (!user) {
    response.status(404).json({ error: "Pending employee account not found." });
    return;
  }
  response.json(publicUser(user));
});

router.post("/:id/reset-password", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.findOneAndUpdate(
    { _id: request.params.id, role: "user" },
    {
      $set: {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
      },
    },
    { new: true, runValidators: true },
  );
  if (!user) {
    response.status(404).json({ error: "Employee not found." });
    return;
  }

  await revokeUserSessions(user._id);
  response.json({ user: publicUser(user), temporaryPassword });
});

router.post("/:id/deactivate", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await User.findOneAndUpdate(
    { _id: request.params.id, role: "user", status: { $ne: "inactive" } },
    { $set: { status: "inactive" } },
    { new: true, runValidators: true },
  );
  if (!user) {
    response.status(404).json({ error: "Active employee account not found." });
    return;
  }
  await revokeUserSessions(user._id);
  response.json(publicUser(user));
});

router.post("/:id/activate", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await User.findOneAndUpdate(
    { _id: request.params.id, role: "user", status: "inactive" },
    { $set: { status: "active" } },
    { new: true, runValidators: true },
  );
  if (!user) {
    response.status(404).json({ error: "Inactive employee account not found." });
    return;
  }
  response.json(publicUser(user));
});

export default router;
