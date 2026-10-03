import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
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
  const tech = await currentTechnician();

  if (!tech) {
    return {
      error: NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 },
      ),
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      technicianId: tech.id,
    },
    select: {
      id: true,
      technicianId: true,
      status: true,
    },
  });

  if (!order) {
    return {
      error: NextResponse.json(
        {
          error:
            "الطلب غير مسند لهذا الفني",
        },
        { status: 403 },
      ),
    };
  }

  return {
    tech,
    order,
    actor: {
      id: tech.id,
      name: tech.name,
      mode: "TECHNICIAN" as const,
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
  const { id } = await params;
  const ctx = await context(id);

  if (ctx.error) return ctx.error;

  try {
    return NextResponse.json(
      await getExecutionSnapshot(
        prisma,
        id,
        ctx.tech!.id,
      ),
    );
  } catch (error: any) {
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
  const { id } = await params;
  const ctx = await context(id);

  if (ctx.error) return ctx.error;

  const action =
    new URL(req.url).searchParams.get(
      "action",
    ) || "";

  try {
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
              ctx.tech!.id,
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
              ctx.tech!.id,
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
              ctx.tech!.id,
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
              ctx.tech!.id,
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
    const mapped =
      executionErrorResponse(error);

    return NextResponse.json(
      mapped.body,
      { status: mapped.status },
    );
  }
}
