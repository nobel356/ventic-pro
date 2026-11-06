export async function createClientUploadKey(
  parts: Array<
    string | number
  >,
) {
  const raw =
    parts
      .map((value) =>
        String(value),
      )
      .join("\u001f");

  const bytes =
    new TextEncoder().encode(
      raw,
    );

  if (
    typeof crypto !==
      "undefined" &&
    crypto.subtle
  ) {
    const digest =
      await crypto.subtle.digest(
        "SHA-256",
        bytes,
      );

    const hex =
      Array.from(
        new Uint8Array(
          digest,
        ),
      )
        .map((value) =>
          value
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");

    return `upload-${hex}`;
  }

  // Deterministic fallback for old browsers.
  let hash = 2166136261;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return `upload-fallback-${(
    hash >>> 0
  ).toString(16)}-${bytes.length}`;
}
