import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { requireAuth, requirePasswordChanged } from "./middleware/auth.js";
import Transaction from "./models/Transaction.js";
import User from "./models/User.js";
import WalletProfile from "./models/WalletProfile.js";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import transactionsRouter from "./routes/transactions.js";
import usersRouter from "./routes/users.js";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("This origin is not allowed.");
    error.status = 403;
    callback(error);
  },
}));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "database_disconnected",
  });
});

app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api", requirePasswordChanged);
app.use("/api/transactions", transactionsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/users", usersRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status = error.status
    || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
  if (status >= 500) {
    console.error("API request failed.", error);
  }
  response.status(status).json({
    error: status >= 500 ? "An unexpected server error occurred." : error.message,
  });
});

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expense_tracker";

async function provisionAdministrator() {
  const administrator = await User.findOne({ role: "admin" });
  if (!administrator) {
    console.warn("No administrator account exists. Run `npm run create-admin` in the API directory.");
    return;
  }

  await Transaction.updateMany(
    { $or: [{ userId: { $exists: false } }, { userId: null }] },
    { $set: { userId: administrator._id } },
  );

  const legacyProfile = await WalletProfile.findOne({ key: "default" }).select("fullName");
  if (legacyProfile?.fullName && administrator.fullName === "Organization Admin") {
    administrator.fullName = legacyProfile.fullName;
    await administrator.save();
  }
}

try {
  await mongoose.connect(mongoUri);
  await provisionAdministrator();
  app.listen(port, "127.0.0.1", () => {
    console.log(`Expense tracker API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error("Could not start the expense tracker API.", error);
  await mongoose.disconnect();
  process.exitCode = 1;
}
