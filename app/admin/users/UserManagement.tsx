"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  PERMISSION_OPTIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/permission-config";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CUSTOMER_SERVICE"
  | "TECHNICIAN";

type UserItem = {
  id: string;
  name: string;
  login: string;
  phone: string | null;
  role: Role;
  active: boolean;
  permissions: string[];
  customPermissions: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  login: string;
  phone: string;
  role: Role;
  password: string;
  active: boolean;
  permissions: string[];
};

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "مدير النظام",
  ADMIN: "مدير / Admin",
  CUSTOMER_SERVICE: "خدمة العملاء",
  TECHNICIAN: "فني",
};

function defaultsForRole(role: Role) {
  return role === "SUPER_ADMIN"
    ? []
    : [
        ...(ROLE_DEFAULT_PERMISSIONS[
          role
        ] || []),
      ];
}

const emptyForm: FormState = {
  name: "",
  login: "",
  phone: "",
  role: "CUSTOMER_SERVICE",
  password: "",
  active: true,
  permissions:
    defaultsForRole(
      "CUSTOMER_SERVICE",
    ),
};

export default function UserManagement({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [users, setUsers] =
    useState<UserItem[]>([]);
  const [form, setForm] =
    useState<FormState>(
      emptyForm,
    );
  const [editingId, setEditingId] =
    useState<string | null>(
      null,
    );
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [
    archivingId,
    setArchivingId,
  ] = useState<
    string | null
  >(null);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  const editingUser =
    useMemo(
      () =>
        users.find(
          (user) =>
            user.id ===
            editingId,
        ) || null,
      [users, editingId],
    );

  async function loadUsers() {
    setLoading(true);
    try {
      const response =
        await fetch(
          "/api/admin/users",
          {
            cache:
              "no-store",
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل المستخدمين",
        );
      }

      setUsers(
        data.users || [],
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function editUser(
    user: UserItem,
  ) {
    setEditingId(
      user.id,
    );
    setForm({
      name: user.name,
      login: user.login,
      phone:
        user.phone || "",
      role: user.role,
      password: "",
      active:
        user.active,
      permissions:
        user.role ===
        "SUPER_ADMIN"
          ? []
          : user.customPermissions
            ? user.permissions
            : defaultsForRole(
                user.role,
              ),
    });
    setError("");
    setMessage("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changeRole(
    role: Role,
  ) {
    setForm((current) => ({
      ...current,
      role,
      permissions:
        defaultsForRole(
          role,
        ),
    }));
  }

  function togglePermission(
    permission: string,
  ) {
    setForm((current) => ({
      ...current,
      permissions:
        current.permissions.includes(
          permission,
        )
          ? current.permissions.filter(
              (item) =>
                item !==
                permission,
            )
          : [
              ...current.permissions,
              permission,
            ],
    }));
  }

  async function save() {
    setError("");
    setMessage("");

    if (
      !form.name.trim() ||
      !form.login.trim()
    ) {
      setError(
        "اكتب الاسم واسم الدخول.",
      );
      return;
    }

    if (
      !editingId &&
      form.password.length < 6
    ) {
      setError(
        "كلمة المرور يجب ألا تقل عن 6 أحرف.",
      );
      return;
    }

    if (
      editingId &&
      form.password &&
      form.password.length < 6
    ) {
      setError(
        "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          editingId
            ? `/api/admin/users/${editingId}`
            : "/api/admin/users",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              form,
            ),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر حفظ المستخدم",
        );
      }

      setMessage(
        editingId
          ? "تم تحديث المستخدم بنجاح."
          : "تم إنشاء المستخدم بنجاح.",
      );

      await loadUsers();

      if (!editingId) {
        setForm(
          emptyForm,
        );
      } else {
        setForm(
          (current) => ({
            ...current,
            password: "",
          }),
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveUser(
    user: UserItem,
  ) {
    if (
      user.id ===
      currentUserId
    ) {
      setError(
        "لا يمكنك أرشفة حسابك الحالي.",
      );
      return;
    }

    const reason =
      window.prompt(
        `سبب أرشفة المستخدم ${user.name}:`,
      );

    if (
      reason === null
    ) {
      return;
    }

    if (
      reason.trim().length <
      3
    ) {
      setError(
        "سبب الأرشفة يجب ألا يقل عن 3 أحرف.",
      );
      return;
    }

    if (
      !window.confirm(
        `سيتم نقل ${user.name} إلى Archive Vault وإيقاف جلساته الحالية. متابعة؟`,
      )
    ) {
      return;
    }

    setArchivingId(
      user.id,
    );
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/archive/users/${user.id}`,
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                reason:
                  reason.trim(),
              },
            ),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر أرشفة المستخدم.",
        );
      }

      if (
        editingId ===
        user.id
      ) {
        resetForm();
      }

      setMessage(
        `تم نقل ${user.name} إلى Archive Vault.`,
      );
      await loadUsers();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر أرشفة المستخدم.",
      );
    } finally {
      setArchivingId(
        null,
      );
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 22,
      }}
    >
      <section
        style={{
          background: "white",
          border:
            "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 20,
          boxShadow:
            "0 10px 30px rgba(15,23,42,.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            alignItems:
              "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              {editingId
                ? "تعديل المستخدم"
                : "إضافة مستخدم جديد"}
            </h2>
            <p
              style={{
                color:
                  "#64748b",
                marginBottom: 0,
              }}
            >
              كلمة المرور لا يتم عرضها بعد الحفظ، ويمكنك تغييرها من هنا وقت الحاجة.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={
                resetForm
              }
              style={
                secondaryButtonStyle
              }
            >
              إضافة مستخدم جديد
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          <Field label="الاسم">
            <input
              style={inputStyle}
              value={
                form.name
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  name:
                    event
                      .target
                      .value,
                })
              }
              placeholder="مثال: أحمد محمد"
            />
          </Field>

          <Field label="اسم المستخدم / البريد الإلكتروني">
            <input
              style={inputStyle}
              value={
                form.login
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  login:
                    event
                      .target
                      .value,
                })
              }
              placeholder="مثال: ahmed.tech أو name@email.com"
              autoCapitalize="none"
            />
          </Field>

          <Field label="رقم الهاتف">
            <input
              style={inputStyle}
              value={
                form.phone
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  phone:
                    event
                      .target
                      .value,
                })
              }
              placeholder="01xxxxxxxxx"
            />
          </Field>

          <Field label="نوع المستخدم">
            <select
              style={inputStyle}
              value={
                form.role
              }
              onChange={(
                event,
              ) =>
                changeRole(
                  event
                    .target
                    .value as Role,
                )
              }
            >
              {Object.entries(
                roleLabels,
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field
            label={
              editingId
                ? "كلمة مرور جديدة (اختياري)"
                : "كلمة المرور"
            }
          >
            <input
              style={inputStyle}
              type="password"
              value={
                form.password
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  password:
                    event
                      .target
                      .value,
                })
              }
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
            />
          </Field>

          <Field label="حالة الحساب">
            <label
              style={{
                minHeight: 44,
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 10,
                padding:
                  "0 12px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: 10,
              }}
            >
              <input
                type="checkbox"
                checked={
                  form.active
                }
                disabled={
                  editingId ===
                  currentUserId
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    active:
                      event
                        .target
                        .checked,
                  })
                }
              />
              {form.active
                ? "الحساب نشط"
                : "الحساب موقوف"}
            </label>
          </Field>
        </div>

        <div
          style={{
            marginTop: 22,
          }}
        >
          <h3
            style={{
              marginBottom: 6,
            }}
          >
            الصلاحيات
          </h3>

          {form.role ===
          "SUPER_ADMIN" ? (
            <div
              style={{
                background:
                  "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                borderRadius: 12,
                padding: 14,
                color:
                  "#1e3a5f",
              }}
            >
              مدير النظام لديه كل الصلاحيات تلقائيًا، ومنها إدارة المستخدمين وArchive Vault.
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {PERMISSION_OPTIONS.map(
                (
                  permission,
                ) => (
                  <label
                    key={
                      permission.value
                    }
                    style={{
                      display:
                        "flex",
                      gap: 10,
                      alignItems:
                        "flex-start",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      cursor:
                        "pointer",
                      background:
                        form.permissions.includes(
                          permission.value,
                        )
                          ? "#fff7ed"
                          : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(
                        permission.value,
                      )}
                      onChange={() =>
                        togglePermission(
                          permission.value,
                        )
                      }
                      style={{
                        marginTop: 4,
                      }}
                    />
                    <span>
                      <strong
                        style={{
                          display:
                            "block",
                          color:
                            "#0f2d4a",
                        }}
                      >
                        {
                          permission.label
                        }
                      </strong>
                      <small
                        style={{
                          color:
                            "#64748b",
                          lineHeight: 1.5,
                        }}
                      >
                        {
                          permission.description
                        }
                      </small>
                    </span>
                  </label>
                ),
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            style={errorStyle}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={
              successStyle
            }
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              void save()
            }
            disabled={saving}
            style={
              primaryButtonStyle
            }
          >
            {saving
              ? "جاري الحفظ..."
              : editingId
                ? "حفظ التعديلات"
                : "إنشاء المستخدم"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={
                resetForm
              }
              style={
                secondaryButtonStyle
              }
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </section>

      <section
        style={{
          background: "white",
          border:
            "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          الحسابات الحالية
        </h2>

        <p
          style={{
            color: "#64748b",
            marginTop: -4,
          }}
        >
          الأرشفة لا تحذف الحساب نهائيًا؛ تنقله إلى Archive Vault وتلغي جلساته الحالية، ويمكن استرجاعه لاحقًا.
        </p>

        {loading ? (
          <p>
            جاري تحميل المستخدمين...
          </p>
        ) : users.length ===
          0 ? (
          <p>
            لا توجد حسابات.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {users.map(
              (user) => (
                <div
                  key={
                    user.id
                  }
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "minmax(180px, 1.4fr) minmax(160px, 1fr) minmax(140px, .8fr) auto auto",
                    gap: 12,
                    alignItems:
                      "center",
                    padding: 14,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 12,
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          "#0f2d4a",
                      }}
                    >
                      {
                        user.name
                      }
                    </strong>
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize: 13,
                        marginTop: 3,
                      }}
                    >
                      {user.login}
                      {user.phone
                        ? ` — ${user.phone}`
                        : ""}
                    </div>
                  </div>

                  <div>
                    <strong>
                      {
                        roleLabels[
                          user.role
                        ]
                      }
                    </strong>
                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "#64748b",
                        marginTop: 3,
                      }}
                    >
                      {user.role ===
                      "SUPER_ADMIN"
                        ? "صلاحيات كاملة"
                        : `${user.permissions.length} صلاحية مخصصة`}
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display:
                          "inline-block",
                        padding:
                          "5px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background:
                          user.active
                            ? "#dcfce7"
                            : "#fee2e2",
                        color:
                          user.active
                            ? "#166534"
                            : "#991b1b",
                      }}
                    >
                      {user.active
                        ? "نشط"
                        : "موقوف"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      editUser(
                        user,
                      )
                    }
                    style={
                      secondaryButtonStyle
                    }
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    disabled={
                      user.id ===
                        currentUserId ||
                      archivingId ===
                        user.id
                    }
                    onClick={() =>
                      void archiveUser(
                        user,
                      )
                    }
                    style={
                      dangerButtonStyle
                    }
                  >
                    {archivingId ===
                    user.id
                      ? "جاري الأرشفة..."
                      : "أرشفة"}
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 7,
      }}
    >
      <span
        style={{
          fontWeight: 800,
          color: "#334155",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  boxSizing: "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  background: "white",
  font: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "11px 18px",
  background: "#0f2d4a",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 14px",
  background: "white",
  color: "#0f2d4a",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  border:
    "1px solid #fecaca",
  borderRadius: 10,
  padding: "9px 14px",
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: 800,
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
};

const successStyle: CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "#f0fdf4",
  color: "#166534",
};
