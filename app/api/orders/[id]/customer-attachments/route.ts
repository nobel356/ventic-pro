import { NextResponse } from "next/server";
import { getRuntimeControl } from "@/lib/runtime-control";
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
  uploadOrderImage,
} from "@/lib/storage";
import {
  findUploadReplay,
  normalizeUploadKey,
  persistUploadedAttachment,
} from "@/lib/upload-integrity";

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
    const {
      control,
    } = await getRuntimeControl();

    if (!control.uploads) {
      return NextResponse.json(
        {
          error:
            "رفع الصور متوقف مؤقتًا.",
        },
        { status: 503 },
      );
    }

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

    let uploadKey:
      | string
      | null = null;

    try {
      uploadKey =
        normalizeUploadKey(
          req.headers.get(
            "x-upload-key",
          ),
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "معرّف رفع الصورة غير صالح.",
        },
        { status: 400 },
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

    const replay =
      await findUploadReplay(
        prisma,
        {
          orderId: id,
          uploadKey,
        },
      );

    if (replay) {
      return NextResponse.json(
        {
          ok: true,
          id: replay.id,
          idempotentReplay:
            true,
        },
        { status: 200 },
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

    const persisted =
      await persistUploadedAttachment(
        prisma,
        {
          attachment: {
            orderId: id,
            kind: "CUSTOMER",
            fileName:
              `${label} — ${file.name}`,
            mimeType:
              file.type,
            storagePath:
              stored.pathname,
            uploadKey,
          },
          cleanupPath:
            stored.pathname,
          audit: (
            attachmentId,
          ) => ({
            orderId: id,
            actorLabel:
              "العميل",
            action:
              "CUSTOMER_PHOTO_ADDED",
            newValue: {
              attachmentId,
              label,
              fileName:
                file.name,
              storageProvider:
                "vercel_blob",
              storagePath:
                stored.pathname,
              size:
                stored.size,
              uploadKey:
                uploadKey ||
                null,
            },
          }),
        },
      );

    return NextResponse.json(
      {
        ok: true,
        id:
          persisted.item.id,
        idempotentReplay:
          persisted.replayed,
      },
      {
        status:
          persisted.replayed
            ? 200
            : 201,
      },
    );

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
      "INVALID_UPLOAD_KEY"
    ) {
      return NextResponse.json(
        {
          error:
            "معرّف رفع الصورة غير صالح.",
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
