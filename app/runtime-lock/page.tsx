import {
  headers,
} from "next/headers";
import {
  redirect,
} from "next/navigation";

export const dynamic =
  "force-dynamic";

export default async function RuntimeLockPage() {
  const requestHeaders =
    await headers();

  if (
    requestHeaders.get(
      "x-ventic-runtime-lock",
    ) !== "1"
  ) {
    redirect("/");
  }

  return null;
}
