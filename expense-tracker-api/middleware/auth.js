import { createHash, randomBytes } from "node:crypto";
import Session from "../models/Session.js";
import User from "../models/User.js";

const cookieName = "expense_tracker_session";
const sessionDurationMs = 12 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readSessionToken(request) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? cookie.slice(cookieName.length + 1) : "";
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
  };
}

export function setSessionCookie(response, token) {
  response.cookie(cookieName, token, {
    ...cookieOptions(),
    maxAge: sessionDurationMs,
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(cookieName, cookieOptions());
}

export async function createSession(user, response) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + sessionDurationMs),
  });
  setSessionCookie(response, token);
}

export async function revokeUserSessions(userId) {
  await Session.deleteMany({ userId });
}

export async function requireAuth(request, response, next) {
  const token = readSessionToken(request);
  if (!token) {
    response.status(401).json({ error: "Please sign in to continue." });
    return;
  }

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    clearSessionCookie(response);
    response.status(401).json({ error: "Your session has expired. Please sign in again." });
    return;
  }

  const user = await User.findById(session.userId)
    .select("fullName email role department jobTitle salary status mustChangePassword");
  if (!user || user.status !== "active") {
    await Session.deleteOne({ _id: session._id });
    clearSessionCookie(response);
    response.status(401).json({ error: "This account is not active." });
    return;
  }

  request.user = user;
  request.sessionId = session._id;
  next();
}

export async function optionalAuth(request, response, next) {
  const token = readSessionToken(request);
  if (!token) {
    next();
    return;
  }

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    clearSessionCookie(response);
    next();
    return;
  }

  const user = await User.findById(session.userId)
    .select("fullName email role department jobTitle salary status mustChangePassword");
  if (!user || user.status !== "active") {
    await Session.deleteOne({ _id: session._id });
    clearSessionCookie(response);
    next();
    return;
  }

  request.user = user;
  request.sessionId = session._id;
  next();
}

export function requireRole(role) {
  return (request, response, next) => {
    if (request.user?.role !== role) {
      response.status(403).json({ error: "You do not have permission to do that." });
      return;
    }
    next();
  };
}

export function requirePasswordChanged(request, response, next) {
  if (request.user.mustChangePassword) {
    response.status(403).json({ error: "Change your temporary password before continuing." });
    return;
  }
  next();
}

export function getSessionToken(request) {
  return readSessionToken(request);
}

export function tokenDigest(token) {
  return hashToken(token);
}
