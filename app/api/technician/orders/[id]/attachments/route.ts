import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import {
  addExecutionAttachment,
  executionErrorResponse,
} from "@/lib/order-execution";

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const tech = await currentTechnician();

  if (!tech) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      technicianId: tech.id,
    },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json(
      {
        error:
          "الطلب غير مسند لهذا الفني",
      },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(
    form.get("kind") || "",
  );

  if (
    !(file instanceof File) ||
    !["BEFORE", "AFTER"].includes(kind)
  ) {
    return NextResponse.json(
      {
        error:
          "الصورة والنوع مطلوبان",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await addExecutionAttachment(
        prisma,
        {
          orderId: id,
          actor: {
            id: tech.id,
            name: tech.name,
            mode: "TECHNICIAN",
          },
          kind: kind as
            | "BEFORE"
            | "AFTER",
          file,
        },
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
