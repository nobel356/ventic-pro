import {
  deleteStoredFile,
} from "@/lib/storage";

export function normalizeUploadKey(
  raw: string | null | undefined,
) {
  const key =
    String(raw || "")
      .trim();

  if (!key) {
    return null;
  }

  if (
    key.length < 16 ||
    key.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(
      key,
    )
  ) {
    throw new Error(
      "INVALID_UPLOAD_KEY",
    );
  }

  return key;
}

export async function findUploadReplay(
  client: any,
  input: {
    orderId: string;
    uploadKey?: string | null;
  },
) {
  if (!input.uploadKey) {
    return null;
  }

  return client.attachment.findUnique({
    where: {
      orderId_uploadKey: {
        orderId:
          input.orderId,
        uploadKey:
          input.uploadKey,
      },
    },
  });
}

export async function persistUploadedAttachment(
  client: any,
  input: {
    attachment: {
      orderId: string;
      kind:
        | "CUSTOMER"
        | "BEFORE"
        | "AFTER";
      fileName: string;
      mimeType: string;
      storagePath: string;
      uploadedBy?: string | null;
      uploadKey?: string | null;
    };
    audit: (
      attachmentId: string,
    ) => {
      orderId: string;
      actorId?: string | null;
      actorLabel: string;
      action: string;
      newValue?: Record<
        string,
        unknown
      >;
    };
    cleanupPath: string;
    diagnostic?: {
      failAfterAttachment?:
        boolean;
    };
  },
) {
  try {
    const item =
      await client.$transaction(
        async (tx: any) => {
          const created =
            await tx.attachment.create({
              data: {
                orderId:
                  input.attachment
                    .orderId,
                kind:
                  input.attachment
                    .kind,
                fileName:
                  input.attachment
                    .fileName,
                mimeType:
                  input.attachment
                    .mimeType,
                storagePath:
                  input.attachment
                    .storagePath,
                uploadedBy:
                  input.attachment
                    .uploadedBy ||
                  null,
                uploadKey:
                  input.attachment
                    .uploadKey ||
                  null,
              },
            });

          if (
            input.diagnostic
              ?.failAfterAttachment
          ) {
            throw new Error(
              "QA_FORCED_ATTACHMENT_ROLLBACK",
            );
          }

          await tx.auditLog.create({
            data:
              input.audit(
                created.id,
              ),
          });

          return created;
        },
      );

    return {
      item,
      replayed: false,
    };
  } catch (error: any) {
    await deleteStoredFile(
      input.cleanupPath,
    );

    if (
      error?.code ===
        "P2002" &&
      input.attachment
        .uploadKey
    ) {
      const existing =
        await findUploadReplay(
          client,
          {
            orderId:
              input.attachment
                .orderId,
            uploadKey:
              input.attachment
                .uploadKey,
          },
        );

      if (existing) {
        return {
          item: existing,
          replayed: true,
        };
      }
    }

    throw error;
  }
}
