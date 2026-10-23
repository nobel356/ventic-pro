import crypto from "crypto";

const ALLOWED_PREFIXES = [
  "/customer/account/invoices/",
  "/customer/account/warranty/",
  "/customer/account/orders/",
];

function key() {
  const secret =
    String(
      process.env.AUTH_SECRET ||
        "",
    );

  if (!secret) {
    throw new Error(
      "AUTH_SECRET_MISSING",
    );
  }

  return crypto
    .createHash("sha256")
    .update(
      `ventic-qr:${secret}`,
    )
    .digest();
}

export function isAllowedQrTarget(
  path: string,
) {
  return ALLOWED_PREFIXES.some(
    (prefix) =>
      path.startsWith(
        prefix,
      ),
  );
}

export function createQrAccessToken(
  path: string,
) {
  if (
    !isAllowedQrTarget(
      path,
    )
  ) {
    throw new Error(
      "QR_TARGET_NOT_ALLOWED",
    );
  }

  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key(),
      iv,
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        JSON.stringify({
          v: 1,
          path,
        }),
        "utf8",
      ),
      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  return Buffer.concat([
    iv,
    tag,
    ciphertext,
  ]).toString(
    "base64url",
  );
}

export function readQrAccessToken(
  token: string,
) {
  try {
    const raw =
      Buffer.from(
        token,
        "base64url",
      );

    if (
      raw.length <
      12 + 16 + 1
    ) {
      return null;
    }

    const iv =
      raw.subarray(
        0,
        12,
      );

    const tag =
      raw.subarray(
        12,
        28,
      );

    const ciphertext =
      raw.subarray(28);

    const decipher =
      crypto.createDecipheriv(
        "aes-256-gcm",
        key(),
        iv,
      );

    decipher.setAuthTag(
      tag,
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          ciphertext,
        ),
        decipher.final(),
      ]).toString(
        "utf8",
      );

    const parsed =
      JSON.parse(
        plaintext,
      ) as {
        v?: number;
        path?: string;
      };

    const path =
      String(
        parsed.path ||
          "",
      );

    if (
      parsed.v !== 1 ||
      !isAllowedQrTarget(
        path,
      )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}
