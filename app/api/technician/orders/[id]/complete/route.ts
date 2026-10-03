import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import {
  completeExecution,
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
  const { otp } = await req.json();

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

  try {
    return NextResponse.json(
      await completeExecution(
        prisma,
        {
          orderId: id,
          assignedTechnicianId:
            tech.id,
          actor: {
            id: tech.id,
            name: tech.name,
            mode: "TECHNICIAN",
          },
          otp: String(otp || ""),
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
