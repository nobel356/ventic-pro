import type { ReactNode } from "react";
import OrderEntryGate from "./OrderEntryGate";

export default function OrderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrderEntryGate>
      {children}
    </OrderEntryGate>
  );
}
