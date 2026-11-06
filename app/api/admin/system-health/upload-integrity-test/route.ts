import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredFile,
  getStoredFile,
  storageEnabled,
  uploadOrderImage,
} from "@/lib/storage";
import {
  persistUploadedAttachment,
} from "@/lib/upload-integrity";

async function blobExists(
  pathname: string,
) {
  try {
    await getStoredFile(
      pathname,
    );
    return true;
  } catch {
    return false;
  }
}

export async function POST() {
  const user =
    await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "غير مسموح" },
      { status: 403 },
    );
  }

  if (!storageEnabled()) {
    return NextResponse.json(
      {
        error:
          "STORAGE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const marker =
    randomUUID();
  const orderNo =
    `VP-QA-UP-${marker
      .replace(/-/g, "")
      .slice(0, 10)}`;
  const phone =
    `qa-${marker}`;

  let customerId:
    | string
    | null = null;
  let orderId:
    | string
    | null = null;

  const paths =
    new Set<string>();

  try {
    const customer =
      await prisma.customer.create({
        data: {
          name:
            "Upload QA",
          phone,
        },
      });

    customerId =
      customer.id;

    const order =
      await prisma.order.create({
        data: {
          orderNo,
          customerId:
            customer.id,
        },
      });

    orderId =
      order.id;

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );

    const file =
      new File(
        [png],
        "qa-1x1.png",
        {
          type:
            "image/png",
        },
      );

    // 1) Forced failure after Attachment create:
    // transaction must rollback DB row and Blob must be deleted.
    const failedBlob =
      await uploadOrderImage({
        orderId:
          order.id,
        kind:
          "CUSTOMER",
        file,
      });

    paths.add(
      failedBlob.pathname,
    );

    let forcedFailureCaught =
      false;

    try {
      await persistUploadedAttachment(
        prisma,
        {
          attachment: {
            orderId:
              order.id,
            kind:
              "CUSTOMER",
            fileName:
              "qa-forced-failure.png",
            mimeType:
              "image/png",
            storagePath:
              failedBlob.pathname,
            uploadKey:
              `qa-fail-${marker}`,
          },
          cleanupPath:
            failedBlob.pathname,
          audit: (
            attachmentId,
          ) => ({
            orderId:
              order.id,
            actorLabel:
              "QA",
            action:
              "UPLOAD_QA_FORCED_FAILURE",
            newValue: {
              attachmentId,
            },
          }),
          diagnostic: {
            failAfterAttachment:
              true,
          },
        },
      );
    } catch (error: any) {
      forcedFailureCaught =
        error?.message ===
        "QA_FORCED_ATTACHMENT_ROLLBACK";
    }

    const rollbackRows =
      await prisma.attachment.count({
        where: {
          storagePath:
            failedBlob.pathname,
        },
      });

    const failedBlobExists =
      await blobExists(
        failedBlob.pathname,
      );

    // 2) Successful upload, then simulate retry with same uploadKey.
    const uploadKey =
      `qa-upload-${marker}`;

    const primaryBlob =
      await uploadOrderImage({
        orderId:
          order.id,
        kind:
          "CUSTOMER",
        file,
      });

    paths.add(
      primaryBlob.pathname,
    );

    const primary =
      await persistUploadedAttachment(
        prisma,
        {
          attachment: {
            orderId:
              order.id,
            kind:
              "CUSTOMER",
            fileName:
              "qa-primary.png",
            mimeType:
              "image/png",
            storagePath:
              primaryBlob.pathname,
            uploadKey,
          },
          cleanupPath:
            primaryBlob.pathname,
          audit: (
            attachmentId,
          ) => ({
            orderId:
              order.id,
            actorLabel:
              "QA",
            action:
              "UPLOAD_QA_PRIMARY",
            newValue: {
              attachmentId,
            },
          }),
        },
      );

    const retryBlob =
      await uploadOrderImage({
        orderId:
          order.id,
        kind:
          "CUSTOMER",
        file,
      });

    paths.add(
      retryBlob.pathname,
    );

    const retry =
      await persistUploadedAttachment(
        prisma,
        {
          attachment: {
            orderId:
              order.id,
            kind:
              "CUSTOMER",
            fileName:
              "qa-retry.png",
            mimeType:
              "image/png",
            storagePath:
              retryBlob.pathname,
            uploadKey,
          },
          cleanupPath:
            retryBlob.pathname,
          audit: (
            attachmentId,
          ) => ({
            orderId:
              order.id,
            actorLabel:
              "QA",
            action:
              "UPLOAD_QA_RETRY",
            newValue: {
              attachmentId,
            },
          }),
        },
      );

    const durableRows =
      await prisma.attachment.count({
        where: {
          orderId:
            order.id,
          uploadKey,
        },
      });

    const primaryBlobExists =
      await blobExists(
        primaryBlob.pathname,
      );

    const retryBlobExists =
      await blobExists(
        retryBlob.pathname,
      );

    // 3) Invalid MIME is rejected before Blob write.
    let invalidTypeBlocked =
      false;

    try {
      await uploadOrderImage({
        orderId:
          order.id,
        kind:
          "CUSTOMER",
        file:
          new File(
            ["not-image"],
            "qa.txt",
            {
              type:
                "text/plain",
            },
          ),
      });
    } catch (error: any) {
      invalidTypeBlocked =
        error?.message ===
        "INVALID_IMAGE";
    }

    const checks = {
      storageConfigured:
        true,
      transactionRollback:
        forcedFailureCaught &&
        rollbackRows === 0,
      orphanBlobCleanup:
        !failedBlobExists,
      duplicateRetry:
        retry.replayed ===
          true &&
        primary.item.id ===
          retry.item.id,
      singleDbRow:
        durableRows === 1,
      primaryBlobReadable:
        primaryBlobExists,
      duplicateBlobCleanup:
        !retryBlobExists,
      invalidTypeBlocked,
    };

    const ok =
      Object.values(
        checks,
      ).every(Boolean);

    // Cleanup before returning so the result also proves test hygiene.
    await prisma.auditLog.deleteMany({
      where: {
        orderId:
          order.id,
      },
    });

    await prisma.attachment.deleteMany({
      where: {
        orderId:
          order.id,
      },
    });

    for (const pathname of paths) {
      await deleteStoredFile(
        pathname,
      );
    }

    await prisma.order.delete({
      where: {
        id:
          order.id,
      },
    });

    await prisma.customer.delete({
      where: {
        id:
          customer.id,
      },
    });

    orderId = null;
    customerId = null;

    return NextResponse.json(
      {
        ok,
        checks,
        attempts: {
          forcedRollback:
            1,
          duplicateWrites:
            2,
        },
        cleanup:
          true,
      },
      {
        status: ok
          ? 200
          : 500,
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "UPLOAD_INTEGRITY_QA_FAILED",
      },
      { status: 500 },
    );
  } finally {
    if (orderId) {
      try {
        await prisma.auditLog.deleteMany({
          where: {
            orderId,
          },
        });
        await prisma.attachment.deleteMany({
          where: {
            orderId,
          },
        });
        await prisma.order.deleteMany({
          where: {
            id:
              orderId,
          },
        });
      } catch {}
    }

    for (const pathname of paths) {
      await deleteStoredFile(
        pathname,
      );
    }

    if (customerId) {
      try {
        await prisma.customer.deleteMany({
          where: {
            id:
              customerId,
          },
        });
      } catch {}
    }
  }
}
