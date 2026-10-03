"use client";

import { useParams } from "next/navigation";
import ExecutionWorkspace from "@/app/shared/ExecutionWorkspace";

export default function TechnicianJobPage() {
  const params = useParams<{ id: string }>();

  return (
    <main
      dir="rtl"
      style={{
        padding: "24px 16px 70px",
      }}
    >
      <ExecutionWorkspace
        orderId={params.id}
        apiBase={`/api/technician/orders/${params.id}/execution`}
        backHref="/technician"
        title="تنفيذ الطلب"
      />
    </main>
  );
}
