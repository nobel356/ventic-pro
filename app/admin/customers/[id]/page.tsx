import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import CustomerAssetsManager from "./CustomerAssetsManager";

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const canView =
    can(
      user.role,
      PERMISSIONS.CUSTOMER_SENSITIVE,
      user.permissions,
    ) ||
    can(
      user.role,
      PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
      user.permissions,
    );

  if (!canView) redirect("/admin");

  const canEditAssets = can(
    user.role,
    PERMISSIONS.CUSTOMER_ASSETS_EDIT,
    user.permissions,
  );

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      properties: {
        include: {
          devices: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        where: {
          archivedAt: null,
        },
        include: {
          invoice: true,
          technician: {
            select: { name: true },
          },
          warranties: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          maintenanceRequests: {
            select: {
              id: true,
              status: true,
            },
          },
          complaints: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const totalBilled = customer.orders.reduce(
    (sum, order) => sum + Number(order.invoice?.total || 0),
    0,
  );
  const totalDue = customer.orders.reduce(
    (sum, order) => sum + Number(order.invoice?.due || 0),
    0,
  );

  const devices = customer.properties.flatMap((property) =>
    property.devices.map((device) => ({
      id: device.id,
      propertyId: device.propertyId,
      sourceOrderId: device.sourceOrderId,
      type: device.type,
      brand: device.brand,
      model: device.model,
      size: device.size,
      location: device.location,
      installedAt: device.installedAt?.toISOString() || null,
      warrantyEndsAt: device.warrantyEndsAt?.toISOString() || null,
      notes: device.notes,
      active: device.active,
    })),
  );

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <Link href="/admin/customers">← العملاء</Link>

        <div style={heroStyle}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>{customer.name}</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              {customer.phone} — {customer.active ? "حساب نشط" : "حساب موقوف"}
            </p>
          </div>

          <div style={statsStyle}>
            <Stat label="الطلبات" value={customer.orders.length} />
            <Stat label="العقارات" value={customer.properties.length} />
            <Stat label="الأجهزة" value={devices.length} />
            <Stat label="إجمالي الفواتير" value={`${money(totalBilled)} ج`} />
            <Stat label="المتبقي" value={`${money(totalDue)} ج`} danger={totalDue > 0} />
          </div>
        </div>

        {canEditAssets && (
          <div style={{ marginTop: 18 }}>
            <CustomerAssetsManager
              customerId={customer.id}
              properties={customer.properties.map((property) => ({
                id: property.id,
                label: property.label,
                governorate: property.governorate,
                area: property.area,
                address: property.address,
                building: property.building,
                floor: property.floor,
                apartment: property.apartment,
              }))}
              devices={devices}
            />
          </div>
        )}

        <section style={{ ...cardStyle, marginTop: 18 }}>
          <h2 style={{ marginTop: 0 }}>تاريخ الطلبات والتركيبات</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900 }}>
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>الحالة</th>
                  <th>الفني</th>
                  <th>الفاتورة</th>
                  <th>المتبقي</th>
                  <th>الضمان</th>
                  <th>ما بعد التركيب</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => {
                  const warranty = order.warranties[0] || null;
                  const aftercare =
                    order.maintenanceRequests.length +
                    order.complaints.length;

                  return (
                    <tr key={order.id}>
                      <td>{order.orderNo}</td>
                      <td>{order.status}</td>
                      <td>{order.technician?.name || "-"}</td>
                      <td>
                        {order.invoice
                          ? `${money(order.invoice.total)} ج`
                          : "-"}
                      </td>
                      <td>
                        {order.invoice
                          ? `${money(order.invoice.due)} ج`
                          : "-"}
                      </td>
                      <td>
                        {warranty
                          ? `حتى ${warranty.endsAt.toLocaleDateString("ar-EG")}`
                          : "-"}
                      </td>
                      <td>{aftercare}</td>
                      <td>
                        <Link href={`/admin/orders/${order.id}`}>
                          فتح الطلب
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ ...cardStyle, marginTop: 18 }}>
          <h2 style={{ marginTop: 0 }}>العقارات والأجهزة</h2>

          {customer.properties.length === 0 ? (
            <p>لا توجد عقارات مسجلة.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {customer.properties.map((property) => (
                <article key={property.id} style={propertyCardStyle}>
                  <strong style={{ fontSize: 17 }}>
                    {property.label || "عقار"}
                  </strong>
                  <p style={{ color: "#64748b" }}>
                    {property.governorate} — {property.area} — {property.address}
                  </p>

                  <div style={{ display: "grid", gap: 7 }}>
                    {property.devices.map((device) => (
                      <div key={device.id} style={deviceStyle}>
                        <span>
                          <b>{device.type}</b>
                          <small style={{ display: "block", color: "#64748b" }}>
                            {[device.brand, device.model, device.size, device.location]
                              .filter(Boolean)
                              .join(" — ") || "تفاصيل إضافية غير مسجلة"}
                          </small>
                        </span>
                        <span>{device.active ? "نشط" : "خارج الخدمة"}</span>
                        <span>
                          {device.warrantyEndsAt
                            ? `ضمان حتى ${device.warrantyEndsAt.toLocaleDateString("ar-EG")}`
                            : "بدون تاريخ ضمان"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div style={statStyle}>
      <b style={{ color: danger ? "#b91c1c" : "#0f2d4a", fontSize: 20 }}>
        {value}
      </b>
      <small style={{ color: "#64748b" }}>{label}</small>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  marginTop: 12,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 8,
};

const statStyle: React.CSSProperties = {
  minWidth: 120,
  border: "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 10,
  display: "grid",
  gap: 3,
  background: "#f8fafc",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
};

const propertyCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 14,
  background: "#f8fafc",
};

const deviceStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px,1fr) auto auto",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "white",
};
