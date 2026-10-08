import {
  del,
  get,
  put,
} from "@vercel/blob";
import {
  safeDiagnostic,
  safeDiagnosticError,
} from "@/lib/safe-diagnostics";

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
  safeDiagnostic(
    "blob.upload.start",
    {
      orderId:
        input.orderId,
      kind: input.kind,
      provider:
        provider(),
      mimeType:
        input.file.type,
      size:
        input.file.size,
    },
  );

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

  try {
    const blob = await put(
      pathname,
      input.file,
      {
        access: "private",
        addRandomSuffix: false,
      },
    );

    safeDiagnostic(
      "blob.upload.success",
      {
        orderId:
          input.orderId,
        kind: input.kind,
        size:
          input.file.size,
        provider:
          "vercel_blob",
      },
    );

    return {
      pathname: blob.pathname,
      size: input.file.size,
      contentType:
        input.file.type,
    };
  } catch (error) {
    safeDiagnosticError(
      "blob.upload",
      error,
      {
        orderId:
          input.orderId,
        kind: input.kind,
        provider:
          "vercel_blob",
      },
    );

    throw error;
  }
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

    safeDiagnostic(
      "blob.delete.success",
      {
        provider:
          "vercel_blob",
      },
    );
  } catch (error) {
    safeDiagnosticError(
      "blob.delete",
      error,
      {
        provider:
          "vercel_blob",
      },
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

  try {
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

    safeDiagnostic(
      "blob.read.success",
      {
        provider:
          "vercel_blob",
      },
    );

    return result;
  } catch (error) {
    safeDiagnosticError(
      "blob.read",
      error,
      {
        provider:
          "vercel_blob",
      },
    );

    throw error;
  }
}
