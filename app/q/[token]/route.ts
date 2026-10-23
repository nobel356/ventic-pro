import { NextResponse } from "next/server";
import { readQrAccessToken } from "@/lib/qr-access-token";

export const dynamic =
  "force-dynamic";

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  const {
    token: rawToken,
  } =
    await context.params;

  const token =
    decodeURIComponent(
      rawToken || "",
    );

  const path =
    readQrAccessToken(
      token,
    );

  if (!path) {
    return NextResponse.redirect(
      new URL(
        "/",
        req.url,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      path,
      req.url,
    ),
  );
}
