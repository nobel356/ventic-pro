export type OrderStatusValue =
  | "NEW"
  | "CONFIRMED"
  | "ASSIGNED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ExecutionMutation =
  | "BEFORE_PHOTO"
  | "AFTER_PHOTO"
  | "MATERIALS"
  | "OTP"
  | "COMPLETE";

const technicianNext: Record<
  string,
  OrderStatusValue
> = {
  ASSIGNED: "ON_THE_WAY",
  ON_THE_WAY: "ARRIVED",
  ARRIVED: "IN_PROGRESS",
};

export function canAdminStatusTransition(
  current: string,
  next: string,
) {
  if (current === next) return true;
  if (
    current === "COMPLETED" ||
    current === "CANCELLED"
  ) return false;
  if (next === "CANCELLED") return true;
  return (
    current === "NEW" &&
    next === "CONFIRMED"
  );
}

export function canAssignTechnician(
  status: string,
) {
  return [
    "NEW",
    "CONFIRMED",
    "ASSIGNED",
  ].includes(status);
}

export function canEditAppointment(
  status: string,
) {
  return canAssignTechnician(status);
}

export function technicianNextStatus(
  current: string,
) {
  return technicianNext[current] || null;
}

export function canTechnicianStatusTransition(
  current: string,
  next: string,
) {
  return (
    technicianNextStatus(current) ===
    next
  );
}

export function canExecutionMutate(
  status: string,
  action: ExecutionMutation,
) {
  if (action === "BEFORE_PHOTO") {
    return (
      status === "ARRIVED" ||
      status === "IN_PROGRESS"
    );
  }
  return status === "IN_PROGRESS";
}

export function assertExecutionMutation(
  status: string,
  action: ExecutionMutation,
) {
  if (!canExecutionMutate(status, action)) {
    throw new Error(
      action === "BEFORE_PHOTO"
        ? "BEFORE_PHOTO_STAGE_INVALID"
        : action === "AFTER_PHOTO"
          ? "AFTER_PHOTO_STAGE_INVALID"
          : "ORDER_NOT_IN_PROGRESS",
    );
  }
}
