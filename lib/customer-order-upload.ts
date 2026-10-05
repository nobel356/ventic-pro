import crypto from "crypto";

const TOKEN_TTL_MS =
  30 * 60 * 1000;

function secret() {
  const value =
    process.env.AUTH_SECRET;

  if (!value) {
    throw new Error(
      "AUTH_SECRET_MISSING",
    );
  }

  return value;
}

function sign(payload: string) {
  return crypto
    .createHmac(
      "sha256",
      secret(),
    )
    .update(payload)
    .digest("base64url");
}

export function createOrderUploadToken(
  orderId: string,
) {
  const expiresAt =
    Date.now() + TOKEN_TTL_MS;
  const payload =
    `${orderId}.${expiresAt}`;

  return `${payload}.${sign(
    payload,
  )}`;
}

export function verifyOrderUploadToken(
  token: string,
  orderId: string,
) {
  const parts =
    String(token || "").split(
      ".",
    );

  if (parts.length !== 3) {
    return false;
  }

  const [
    tokenOrderId,
    expiresRaw,
    signature,
  ] = parts;

  if (
    tokenOrderId !== orderId
  ) {
    return false;
  }

  const expiresAt =
    Number(expiresRaw);

  if (
    !Number.isFinite(
      expiresAt,
    ) ||
    expiresAt < Date.now()
  ) {
    return false;
  }

  const payload =
    `${tokenOrderId}.${expiresRaw}`;
  const expected =
    sign(payload);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(
        signature,
      ),
      Buffer.from(
        expected,
      ),
    );
  } catch {
    return false;
  }
}
