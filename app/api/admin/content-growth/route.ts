import { NextResponse } from "next/server";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { buildContentGrowthOpportunities } from "@/lib/content-growth";

function daysFrom(
  value: string | null,
) {
  const parsed =
    Number(value || 30);

  if (
    parsed === 7 ||
    parsed === 90
  ) {
    return parsed;
  }

  return 30;
}

export async function GET(
  request: Request,
) {
  try {
    await requirePermission(
      PERMISSIONS.REPORTS_VIEW,
    );

    const days =
      daysFrom(
        new URL(
          request.url,
        ).searchParams.get(
          "days",
        ),
      );

    const result =
      await buildContentGrowthOpportunities(
        days,
      );

    return NextResponse.json(
      result,
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
