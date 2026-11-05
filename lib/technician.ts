import { currentUser } from "./auth-v7";

export async function currentTechnician() {
  const sessionUser =
    await currentUser();

  if (
    sessionUser?.role ===
      "TECHNICIAN" &&
    sessionUser.active
  ) {
    return sessionUser;
  }

  return null;
}
