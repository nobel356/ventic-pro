import crypto from "crypto";

export function newCustomerResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function resetSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET_MISSING");
  }

  return secret;
}

export function hashCustomerResetCode(
  customerId: string,
  code: string,
) {
  return crypto
    .createHmac("sha256", resetSecret())
    .update(`${customerId}:${code}`)
    .digest("hex");
}

export function customerResetCodeMatches(
  customerId: string,
  code: string,
  storedHash: string,
) {
  try {
    const expected = Buffer.from(storedHash, "hex");
    const actual = Buffer.from(
      hashCustomerResetCode(customerId, code),
      "hex",
    );

    if (expected.length !== actual.length) return false;

    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
