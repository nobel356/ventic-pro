import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import {
  confirmNoExecutionMaterials,
  executionErrorResponse,
  getExecutionSnapshot,
  useExecutionMaterial,
} from "@/lib/order-execution";

async function assigned(
  id: string,
  techId: string,
) {
  return prisma.order.findFirst({
    where: {
      id,
      technicianId: techId,
    },
    select: { id: true },
  });
}

export async function GET(
  _req: Request,
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

  if (!(await assigned(id, tech.id))) {
    return NextResponse.json(
      {
        error:
          "الطلب غير مسند لهذا الفني",
      },
      { status: 403 },
    );
  }

  try {
    const snapshot =
      await getExecutionSnapshot(
        prisma,
        id,
        tech.id,
      );

    return NextResponse.json({
      order: snapshot.order,
      items: snapshot.materials.items,
      usage: snapshot.materials.usage,
      confirmed:
        snapshot.materials.confirmed,
      confirmedNone:
        snapshot.materials.confirmedNone,
    });
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
  const tech = await currentTechnician();

  if (!tech) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!(await assigned(id, tech.id))) {
    return NextResponse.json(
      {
        error:
          "الطلب غير مسند لهذا الفني",
      },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();

    if (body?.confirmNone === true) {
      return NextResponse.json(
        await confirmNoExecutionMaterials(
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
          },
        ),
      );
    }

    return NextResponse.json(
      await useExecutionMaterial(
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
  } catch (error: any) {
    const mapped =
      executionErrorResponse(error);

    return NextResponse.json(
      mapped.body,
      { status: mapped.status },
    );
  }
}
