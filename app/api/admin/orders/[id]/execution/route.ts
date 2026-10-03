import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  addExecutionAttachment,
  completeExecution,
  confirmNoExecutionMaterials,
  executionErrorResponse,
  getExecutionSnapshot,
  issueExecutionOtp,
  useExecutionMaterial,
} from "@/lib/order-execution";

async function context(id: string) {
  const actor = await requirePermission(
    PERMISSIONS.ORDERS_EDIT,
  );

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      technician: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!order) {
    return {
      error: NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 },
      ),
    };
  }

  if (!order.technicianId) {
    return {
      error: NextResponse.json(
        {
          error:
            "عين فني للطلب أولًا قبل فتح شاشة التنفيذ.",
        },
        { status: 409 },
      ),
    };
  }

  return {
    order,
    assignedTechnicianId:
      order.technicianId,
    actor: {
      id: actor.id,
      name: actor.name,
      mode: "ADMIN" as const,
    },
  };
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;
    const ctx = await context(id);

    if (ctx.error) return ctx.error;

    return NextResponse.json(
      await getExecutionSnapshot(
        prisma,
        id,
        ctx.assignedTechnicianId!,
      ),
    );
  } catch (error: any) {
    if (
      error?.message ===
        "UNAUTHENTICATED" ||
      error?.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        { error: "غير مصرح" },
        {
          status:
            error.message ===
            "UNAUTHENTICATED"
              ? 401
              : 403,
        },
      );
    }

    const mapped =
      executionErrorResponse(error);

    return NextResponse.json(
      mapped.body,
      { status: mapped.status },
    );
  }
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;
    const ctx = await context(id);

    if (ctx.error) return ctx.error;

    const action =
      new URL(req.url).searchParams.get(
        "action",
      ) || "";

    if (action === "attachment") {
      const form = await req.formData();
      const file = form.get("file");
      const kind = String(
        form.get("kind") || "",
      );

      if (
        !(file instanceof File) ||
        !["BEFORE", "AFTER"].includes(
          kind,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "الصورة والنوع مطلوبان",
          },
          { status: 400 },
        );
      }

      const item =
        await addExecutionAttachment(
          prisma,
          {
            orderId: id,
            actor: ctx.actor!,
            kind: kind as
              | "BEFORE"
              | "AFTER",
            file,
          },
        );

      return NextResponse.json(item);
    }

    const body =
      action === "otp"
        ? {}
        : await req.json();

    if (action === "material") {
      return NextResponse.json(
        await useExecutionMaterial(
          prisma,
          {
            orderId: id,
            assignedTechnicianId:
              ctx.assignedTechnicianId!,
            actor: ctx.actor!,
            itemId: String(
              body?.itemId || "",
            ),
            quantity: Number(
              body?.quantity || 0,
            ),
            note: String(
              body?.note || "",
            ),
          },
        ),
      );
    }

    if (action === "confirm-none") {
      return NextResponse.json(
        await confirmNoExecutionMaterials(
          prisma,
          {
            orderId: id,
            assignedTechnicianId:
              ctx.assignedTechnicianId!,
            actor: ctx.actor!,
          },
        ),
      );
    }

    if (action === "otp") {
      return NextResponse.json(
        await issueExecutionOtp(
          prisma,
          {
            orderId: id,
            assignedTechnicianId:
              ctx.assignedTechnicianId!,
            actor: ctx.actor!,
          },
        ),
      );
    }

    if (action === "complete") {
      return NextResponse.json(
        await completeExecution(
          prisma,
          {
            orderId: id,
            assignedTechnicianId:
              ctx.assignedTechnicianId!,
            actor: ctx.actor!,
            otp: String(
              body?.otp || "",
            ),
          },
        ),
      );
    }

    return NextResponse.json(
      { error: "إجراء غير صالح" },
      { status: 400 },
    );
  } catch (error: any) {
    if (
      error?.message ===
        "UNAUTHENTICATED" ||
      error?.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        { error: "غير مصرح" },
        {
          status:
            error.message ===
            "UNAUTHENTICATED"
              ? 401
              : 403,
        },
      );
    }

    const mapped =
      executionErrorResponse(error);

    return NextResponse.json(
      mapped.body,
      { status: mapped.status },
    );
  }
}
