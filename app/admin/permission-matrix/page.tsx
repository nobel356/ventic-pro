import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  currentUser,
  can,
} from "@/lib/auth-v7";
import {
  PERMISSIONS,
  PERMISSION_OPTIONS,
  ROLE_DEFAULT_PERMISSIONS,
  CUSTOM_PERMISSIONS_MARKER,
} from "@/lib/permission-config";

export const dynamic = "force-dynamic";

const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "CUSTOMER_SERVICE",
  "TECHNICIAN",
];

const sensitive = new Set([
  PERMISSIONS.CUSTOMER_SENSITIVE,
  PERMISSIONS.ACCOUNTING_VIEW,
  PERMISSIONS.PAYMENTS_MANAGE,
  PERMISSIONS.INVENTORY_COST_VIEW,
  PERMISSIONS.ARCHIVE_MANAGE,
  PERMISSIONS.ARCHIVE_RESTORE,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_IMPERSONATE,
]);

export default async function PermissionMatrixPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    redirect("/admin");
  }

  const allPermissions =
    Object.values(PERMISSIONS);

  const labels =
    new Map(
      PERMISSION_OPTIONS.map(
        (item) => [
          item.value,
          item.label,
        ],
      ),
    );

  const activeUsers =
    await prisma.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

  const customUsers =
    activeUsers.filter(
      (item) =>
        item.permissions.includes(
          CUSTOM_PERMISSIONS_MARKER,
        ),
    );

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1500,
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
          Permission Matrix Audit
        </h1>
        <p style={muted}>
          Matrix محسوبة من نفس `permission-config` و`can()` المستخدمة في النظام، مش جدول يدوي منفصل.
        </p>

        <div style={stats}>
          <Stat
            label="Active users"
            value={
              activeUsers.length
            }
          />
          <Stat
            label="Custom overrides"
            value={
              customUsers.length
            }
          />
          <Stat
            label="Permissions"
            value={
              allPermissions.length
            }
          />
        </div>

        <section style={card}>
          <h2 style={h2}>
            Default Role Matrix
          </h2>

          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  <th>
                    Permission
                  </th>
                  {roles.map(
                    (role) => (
                      <th
                        key={role}
                      >
                        {role}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {allPermissions.map(
                  (permission) => (
                    <tr
                      key={
                        permission
                      }
                      style={{
                        background:
                          sensitive.has(
                            permission as any,
                          )
                            ? "#fff7ed"
                            : undefined,
                      }}
                    >
                      <td>
                        <strong>
                          {labels.get(
                            permission as any,
                          ) ||
                            permission}
                        </strong>
                        <div
                          style={{
                            color:
                              "#64748b",
                            fontSize:
                              11,
                          }}
                        >
                          {
                            permission
                          }
                        </div>
                      </td>

                      {roles.map(
                        (role) => {
                          const allowed =
                            role ===
                            "SUPER_ADMIN"
                              ? true
                              : can(
                                  role,
                                  permission,
                                  ROLE_DEFAULT_PERMISSIONS[
                                    role
                                  ] ||
                                    [],
                                );

                          return (
                            <td
                              key={
                                role
                              }
                            >
                              <span
                                style={{
                                  ...pill,
                                  background:
                                    allowed
                                      ? "#f0fdf4"
                                      : "#f8fafc",
                                  color:
                                    allowed
                                      ? "#166534"
                                      : "#94a3b8",
                                }}
                              >
                                {allowed
                                  ? "YES"
                                  : "—"}
                              </span>
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={card}>
          <h2 style={h2}>
            Active Custom Overrides
          </h2>

          {customUsers.length ===
          0 ? (
            <p style={muted}>
              لا يوجد مستخدم Active عليه Custom Permission override.
            </p>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gap: 8,
              }}
            >
              {customUsers.map(
                (item) => (
                  <div
                    key={item.id}
                    style={userRow}
                  >
                    <div>
                      <strong>
                        {
                          item.name
                        }
                      </strong>
                      <div
                        style={{
                          color:
                            "#64748b",
                          fontSize:
                            12,
                        }}
                      >
                        {
                          item.role
                        }{" "}
                        ·{" "}
                        {
                          item.email
                        }
                      </div>
                    </div>

                    <small>
                      {
                        item.permissions.filter(
                          (p) =>
                            p !==
                            CUSTOM_PERMISSIONS_MARKER,
                        ).length
                      }{" "}
                      explicit permissions
                    </small>
                  </div>
                ),
              )}
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
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={stat}>
      <small>
        {label}
      </small>
      <strong>
        {value}
      </strong>
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(160px,1fr))",
  gap: 8,
  marginTop: 16,
};
const stat: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 12,
  padding: 11,
  display: "grid",
  gap: 4,
};
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
  marginTop: 16,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const userRow: React.CSSProperties = {
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  flexWrap: "wrap",
};
