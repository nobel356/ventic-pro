import {
  del,
  get,
  put,
} from "@vercel/blob";

const MAX_IMAGE_BYTES =
  4 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function provider() {
  return String(
    process.env.STORAGE_PROVIDER ||
      "disabled",
  )
    .trim()
    .toLowerCase();
}

export function storageEnabled() {
  return provider() ===
    "vercel_blob";
}

function safeName(name: string) {
  return String(name || "photo.jpg")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "photo.jpg";
}

export async function uploadOrderImage(
  input: {
    orderId: string;
    kind: "CUSTOMER" | "BEFORE" | "AFTER";
    file: File;
  },
) {
  if (!storageEnabled()) {
    throw new Error(
      "STORAGE_NOT_CONFIGURED",
    );
  }

  if (
    !allowedImageTypes.has(
      input.file.type,
    )
  ) {
    throw new Error("INVALID_IMAGE");
  }

  if (
    input.file.size >
    MAX_IMAGE_BYTES
  ) {
    throw new Error(
      "IMAGE_TOO_LARGE",
    );
  }

  const filename =
    safeName(input.file.name);
  const pathname = [
    "orders",
    input.orderId,
    input.kind.toLowerCase(),
    `${crypto.randomUUID()}-${filename}`,
  ].join("/");

  const blob = await put(
    pathname,
    input.file,
    {
      access: "private",
      addRandomSuffix: false,
    },
  );

  return {
    pathname: blob.pathname,
    size: input.file.size,
    contentType:
      input.file.type,
  };
}

export async function deleteStoredFile(
  pathname: string,
) {
  if (
    !storageEnabled() ||
    !pathname ||
    pathname.startsWith(
      "pending://",
    )
  ) {
    return;
  }

  try {
    await del(pathname);
  } catch (error) {
    console.error(
      "BLOB_DELETE_FAILED",
      error,
    );
  }
}

export async function getStoredFile(
  pathname: string,
) {
  if (!storageEnabled()) {
    throw new Error(
      "STORAGE_NOT_CONFIGURED",
    );
  }

  if (
    !pathname ||
    pathname.startsWith(
      "pending://",
    )
  ) {
    throw new Error(
      "LEGACY_ATTACHMENT_UNAVAILABLE",
    );
  }

  const result = await get(
    pathname,
    {
      access: "private",
      useCache: true,
    },
  );

  if (!result) {
    throw new Error(
      "ATTACHMENT_NOT_FOUND",
    );
  }

  return result;
}
