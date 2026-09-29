import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      login: user.email,
      role: user.role,
    },
  });
}
