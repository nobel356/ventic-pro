import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";
import {
  verifyOrderUploadToken,
} from "@/lib/customer-order-upload";
import {
  deleteStoredFile,
  uploadOrderImage,
} from "@/lib/storage";

const MAX_CUSTOMER_PHOTOS =
  40;

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await params;
    const token =
      req.headers.get(
        "x-order-upload-token",
      ) || "";

    if (
      !verifyOrderUploadToken(
        token,
        id,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "رابط رفع الصور غير صالح أو انتهت صلاحيته.",
        },
        { status: 403 },
      );
    }

    const limited = rateLimit(
      `customer-photo:${clientIp(
        req,
      )}:${id}`,
      {
        limit: 60,
        windowMs:
          30 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم تجاوز عدد محاولات رفع الصور مؤقتًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(
              limited,
            ),
        },
      );
    }

    const order =
      await prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderNo: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "الطلب غير موجود.",
        },
        { status: 404 },
      );
    }

    const currentCount =
      await prisma.attachment.count({
        where: {
          orderId: id,
          kind: "CUSTOMER",
        },
      });

    if (
      currentCount >=
      MAX_CUSTOMER_PHOTOS
    ) {
      return NextResponse.json(
        {
          error:
            "وصلت للحد الأقصى لصور الطلب.",
        },
        { status: 409 },
      );
    }

    const form =
      await req.formData();
    const file =
      form.get("file");
    const label = String(
      form.get("label") ||
        "مكان التركيب",
    )
      .trim()
      .slice(0, 80);

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "اختر صورة صحيحة.",
        },
        { status: 400 },
      );
    }

    const stored =
      await uploadOrderImage({
        orderId: id,
        kind: "CUSTOMER",
        file,
      });

    try {
      const attachment =
        await prisma.attachment.create({
          data: {
            orderId: id,
            kind: "CUSTOMER",
            fileName:
              `${label} — ${file.name}`,
            mimeType:
              file.type,
            storagePath:
              stored.pathname,
          },
        });

      await prisma.auditLog.create({
        data: {
          orderId: id,
          actorLabel:
            "العميل",
          action:
            "CUSTOMER_PHOTO_ADDED",
          newValue: {
            attachmentId:
              attachment.id,
            label,
            fileName:
              file.name,
            storageProvider:
              "vercel_blob",
            size:
              stored.size,
          },
        },
      });

      return NextResponse.json(
        {
          ok: true,
          id: attachment.id,
        },
        { status: 201 },
      );
    } catch (error) {
      await deleteStoredFile(
        stored.pathname,
      );
      throw error;
    }
  } catch (error: any) {
    const code =
      String(
        error?.message ||
          "",
      );

    if (
      code ===
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

    if (
      code ===
      "INVALID_IMAGE"
    ) {
      return NextResponse.json(
        {
          error:
            "نوع الصورة غير مدعوم.",
        },
        { status: 400 },
      );
    }

    if (
      code ===
      "IMAGE_TOO_LARGE"
    ) {
      return NextResponse.json(
        {
          error:
            "الصورة كبيرة جدًا.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          code ||
          "تعذر رفع الصورة.",
      },
      { status: 500 },
    );
  }
}
