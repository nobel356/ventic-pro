import crypto from "crypto";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;

    const expected = Buffer.from(key, "hex");
    const actual = Buffer.from(
      crypto.scryptSync(password, salt, 64).toString("hex"),
      "hex",
    );

    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
