import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { currentCustomer } from "@/lib/customer-auth";
import { getStoredFile } from "@/lib/storage";

function safeFileName(
  value: string,
) {
  return value
    .replace(/[\r\n"]/g, "")
    .slice(0, 160);
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await params;

    const attachment =
      await prisma.attachment.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              customerId: true,
              technicianId: true,
            },
          },
        },
      });

    if (!attachment) {
      return NextResponse.json(
        {
          error:
            "الملف غير موجود",
        },
        { status: 404 },
      );
    }

    let authorized = false;

    const user =
      await currentUser();

    if (user) {
      if (
        user.role ===
        "TECHNICIAN"
      ) {
        authorized =
          attachment.order
            .technicianId ===
          user.id;
      } else {
        authorized = can(
          user.role,
          PERMISSIONS.ORDERS_VIEW,
          user.permissions,
        );
      }
    }

    if (!authorized) {
      const customer =
        await currentCustomer();

      authorized =
        Boolean(customer) &&
        customer!.id ===
          attachment.order
            .customerId;
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "غير مصرح" },
        { status: 403 },
      );
    }

    const stored =
      await getStoredFile(
        attachment.storagePath,
      );

    return new Response(
      stored.stream,
      {
        headers: {
          "Content-Type":
            stored.blob
              .contentType ||
            attachment.mimeType ||
            "application/octet-stream",
          "Content-Disposition":
            `inline; filename="${safeFileName(
              attachment.fileName,
            )}"`,
          "Cache-Control":
            "private, max-age=60",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error: any) {
    const message = String(
      error?.message || "",
    );

    if (
      message ===
      "LEGACY_ATTACHMENT_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "هذه الصورة القديمة لم تكن محفوظة في تخزين دائم.",
        },
        { status: 410 },
      );
    }

    if (
      message ===
      "STORAGE_NOT_CONFIGURED"
    ) {
      return NextResponse.json(
        {
          error:
            "تخزين الصور غير مفعّل.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          message ||
          "تعذر فتح الملف",
      },
      { status: 500 },
    );
  }
}
