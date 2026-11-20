import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !/^[a-f\d]{128}$/i.test(keyHex || "")) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt, KEY_LENGTH);
  return timingSafeEqual(expected, actual);
}

export function generateTemporaryPassword() {
  return randomBytes(18).toString("base64url");
}
