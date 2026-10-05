import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import AftercareManagement from "./AftercareManagement";

export default async function AftercarePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.AFTERCARE_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const canManage = can(
    user.role,
    PERMISSIONS.AFTERCARE_MANAGE,
    user.permissions,
  );

  const [
    warranties,
    maintenance,
    complaints,
    scheduled,
  ] = await Promise.all([
    prisma.warranty.count({
      where: {
        status: "ACTIVE",
        endsAt: { gte: new Date() },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: {
          in: [
            "OPEN",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      },
    }),
    prisma.complaint.count({
      where: {
        status: {
          in: [
            "OPEN",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      },
    }),
    prisma.technicianSlot.count({
      where: {
        sourceType: {
          in: [
            "MAINTENANCE",
            "COMPLAINT",
          ],
        },
        startsAt: {
          gte: new Date(),
        },
      },
    }),
  ]);

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1450,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <h1
          style={{
            marginBottom: 6,
          }}
        >
          ما بعد التركيب
        </h1>
        <p
          style={{
            color: "#64748b",
            marginTop: 0,
          }}
        >
          الضمان والصيانة والشكاوى وإعادة الزيارة في دورة واحدة مرتبطة بالطلب والعقار والجهاز والفني.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
            margin: "20px 0",
          }}
        >
          <Stat
            label="ضمان نشط"
            value={warranties}
          />
          <Stat
            label="صيانة مفتوحة"
            value={maintenance}
            danger={
              maintenance > 0
            }
          />
          <Stat
            label="شكاوى مفتوحة"
            value={complaints}
            danger={
              complaints > 0
            }
          />
          <Stat
            label="زيارات مجدولة"
            value={scheduled}
          />
        </div>

        <AftercareManagement
          canManage={canManage}
        />
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        border:
          "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <b
        style={{
          display: "block",
          fontSize: 24,
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {value}
      </b>
      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>
    </div>
  );
}
