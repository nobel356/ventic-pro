import { NextResponse } from "next/server";
import {
  getRuntimeControl,
} from "@/lib/runtime-control";

export const dynamic = "force-dynamic";

export async function GET() {
  const {
    control,
    degraded,
  } = await getRuntimeControl();

  return NextResponse.json(
    {
      ...control,
      degraded,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}
