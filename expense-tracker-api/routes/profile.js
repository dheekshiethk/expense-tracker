import { Router } from "express";
import User from "../models/User.js";

const router = Router();

function profileFields(user) {
  return {
    fullName: user.fullName,
    email: user.email,
    department: user.department,
    jobTitle: user.jobTitle,
    salary: user.salary,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

router.get("/", (request, response) => {
  response.json(profileFields(request.user));
});

router.put("/", async (request, response) => {
  const { fullName, department = "", jobTitle = "" } = request.body || {};
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 100) {
    response.status(400).json({ error: "Full name is required and must be 100 characters or fewer." });
    return;
  }
  if (typeof department !== "string" || department.trim().length > 100
    || typeof jobTitle !== "string" || jobTitle.trim().length > 100) {
    response.status(400).json({ error: "Department and job title must be 100 characters or fewer." });
    return;
  }

  const user = await User.findByIdAndUpdate(
    request.user._id,
    {
      $set: {
        fullName: fullName.trim(),
        department: department.trim(),
        jobTitle: jobTitle.trim(),
      },
    },
    { new: true, runValidators: true },
  );
  response.json(profileFields(user));
});

export default router;
