"use client";

import {
  useEffect,
  useState,
} from "react";

const roleLabels: Record<
  string,
  string
> = {
  SUPER_ADMIN:
    "مدير النظام",
  ADMIN: "مدير",
  CUSTOMER_SERVICE:
    "خدمة العملاء",
  TECHNICIAN: "فني",
};

type Me = {
  id: string;
  name: string;
  login: string;
  role: string;
};

type SwitchUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
};

export default function AccountMenu() {
  const [me, setMe] =
    useState<Me | null>(
      null,
    );
  const [
    originalUser,
    setOriginalUser,
  ] =
    useState<Me | null>(
      null,
    );
  const [
    canSwitch,
    setCanSwitch,
  ] = useState(false);
  const [
    impersonating,
    setImpersonating,
  ] = useState(false);
  const [open, setOpen] =
    useState(false);
  const [
    switchingOpen,
    setSwitchingOpen,
  ] = useState(false);
  const [users, setUsers] =
    useState<SwitchUser[]>([]);
  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(false);
  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);
  const [
    switching,
    setSwitching,
  ] = useState(false);
  const [error, setError] =
    useState("");

  async function loadMe() {
    try {
      const response =
        await fetch(
          "/api/auth/me",
          {
            cache:
              "no-store",
          },
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (data?.user) {
        setMe(data.user);
        setCanSwitch(
          Boolean(
            data?.session
              ?.canSwitch,
          ),
        );
        setImpersonating(
          Boolean(
            data?.session
              ?.impersonating,
          ),
        );
        setOriginalUser(
          data?.session
            ?.originalUser ||
            null,
        );
      }
    } catch {
      // Keep account control hidden if session lookup fails.
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadUsers() {
    if (loadingUsers) {
      return;
    }

    setLoadingUsers(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/switch-users",
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
        data?.users || [],
      );
      setSwitchingOpen(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل المستخدمين",
      );
    } finally {
      setLoadingUsers(
        false,
      );
    }
  }

  async function switchTo(
    targetUserId: string,
  ) {
    if (switching) return;

    setSwitching(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/switch-users",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                targetUserId,
              }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تبديل المستخدم",
        );
      }

      window.location.href =
        data?.user?.role ===
        "TECHNICIAN"
          ? "/technician"
          : "/admin";
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تبديل المستخدم",
      );
      setSwitching(false);
    }
  }

  async function restore() {
    if (switching) return;

    setSwitching(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/switch-users",
          {
            method:
              "DELETE",
          },
        );

      if (!response.ok) {
        const data =
          await response.json();
        throw new Error(
          data?.error ||
            "تعذر الرجوع للحساب الأصلي",
        );
      }

      window.location.href =
        "/admin";
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر الرجوع للحساب الأصلي",
      );
      setSwitching(false);
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        },
      );
    } finally {
      window.location.href =
        "/login";
    }
  }

  if (!me) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        top: 14,
        left: 72,
        zIndex: 2100,
        fontFamily:
          "inherit",
      }}
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) =>
              !value,
          )
        }
        title="الحساب الحالي"
        aria-label="الحساب الحالي"
        style={{
          minHeight: 46,
          display: "flex",
          alignItems:
            "center",
          gap: 9,
          border:
            impersonating
              ? "1px solid #fb923c"
              : "1px solid #dbe3ea",
          borderRadius: 14,
          background:
            impersonating
              ? "#fff7ed"
              : "white",
          padding: "7px 10px",
          boxShadow:
            "0 8px 24px rgba(15,23,42,.14)",
          cursor:
            "pointer",
          color:
            "#0f2d4a",
        }}
      >
        <span
          style={{
            fontSize: 20,
          }}
        >
          {impersonating
            ? "🔄"
            : "👤"}
        </span>

        <span
          style={{
            textAlign:
              "right",
            lineHeight: 1.2,
          }}
        >
          <strong
            style={{
              display:
                "block",
              fontSize: 13,
            }}
          >
            {me.name}
          </strong>
          <small
            style={{
              color:
                "#64748b",
              fontSize: 11,
            }}
          >
            {roleLabels[
              me.role
            ] || me.role}
            {impersonating
              ? " · وضع تبديل"
              : ""}
          </small>
        </span>

        <span
          style={{
            color:
              "#94a3b8",
            fontSize: 11,
          }}
        >
          {open
            ? "▲"
            : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position:
              "absolute",
            top: 54,
            left: 0,
            width: 320,
            maxHeight:
              "78vh",
            overflowY:
              "auto",
            background:
              "white",
            border:
              "1px solid #dbe3ea",
            borderRadius: 14,
            boxShadow:
              "0 18px 45px rgba(15,23,42,.18)",
            overflowX:
              "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom:
                "1px solid #edf2f7",
            }}
          >
            <strong
              style={{
                display:
                  "block",
                color:
                  "#0f2d4a",
              }}
            >
              {me.name}
            </strong>
            <small
              style={{
                display:
                  "block",
                color:
                  "#64748b",
                marginTop: 4,
              }}
            >
              {me.login}
            </small>
            <small
              style={{
                display:
                  "block",
                color:
                  "#64748b",
                marginTop: 3,
              }}
            >
              {roleLabels[
                me.role
              ] ||
                me.role}
            </small>

            {impersonating &&
              originalUser && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 9,
                    borderRadius: 9,
                    background:
                      "#fff7ed",
                    color:
                      "#9a3412",
                    fontSize: 12,
                  }}
                >
                  الحساب الأصلي:{" "}
                  <b>
                    {
                      originalUser.name
                    }
                  </b>
                </div>
              )}
          </div>

          {canSwitch && (
            <div
              style={{
                padding: 10,
                borderBottom:
                  "1px solid #edf2f7",
              }}
            >
              {impersonating && (
                <button
                  type="button"
                  disabled={
                    switching
                  }
                  onClick={() =>
                    void restore()
                  }
                  style={{
                    width:
                      "100%",
                    border: 0,
                    borderRadius: 9,
                    padding: 10,
                    background:
                      "#0f2d4a",
                    color:
                      "white",
                    fontWeight: 900,
                    cursor:
                      "pointer",
                    marginBottom: 8,
                  }}
                >
                  الرجوع إلى حسابي الأصلي
                </button>
              )}

              <button
                type="button"
                disabled={
                  loadingUsers
                }
                onClick={() =>
                  void loadUsers()
                }
                style={{
                  width:
                    "100%",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 9,
                  padding: 10,
                  background:
                    "white",
                  color:
                    "#0f2d4a",
                  fontWeight: 900,
                  cursor:
                    "pointer",
                }}
              >
                {loadingUsers
                  ? "جاري التحميل..."
                  : "تبديل المستخدم"}
              </button>

              {switchingOpen &&
                users.length >
                  0 && (
                  <div
                    style={{
                      display:
                        "grid",
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    {users.map(
                      (
                        user,
                      ) => (
                        <button
                          key={
                            user.id
                          }
                          type="button"
                          disabled={
                            switching ||
                            user.id ===
                              me.id
                          }
                          onClick={() =>
                            void switchTo(
                              user.id,
                            )
                          }
                          style={{
                            textAlign:
                              "right",
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: 9,
                            padding: 9,
                            background:
                              user.id ===
                              me.id
                                ? "#f8fafc"
                                : "white",
                            cursor:
                              user.id ===
                              me.id
                                ? "default"
                                : "pointer",
                          }}
                        >
                          <b>
                            {
                              user.name
                            }
                          </b>
                          <small
                            style={{
                              display:
                                "block",
                              color:
                                "#64748b",
                              marginTop: 2,
                            }}
                          >
                            {
                              user.roleLabel
                            }{" "}
                            —{" "}
                            {
                              user.email
                            }
                          </small>
                        </button>
                      ),
                    )}
                  </div>
                )}

              {error && (
                <div
                  style={{
                    color:
                      "#991b1b",
                    background:
                      "#fef2f2",
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void logout()
            }
            disabled={
              loggingOut
            }
            style={{
              width: "100%",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 8,
              border: 0,
              background:
                "#fff",
              color:
                "#b91c1c",
              padding: 13,
              cursor:
                loggingOut
                  ? "wait"
                  : "pointer",
              fontWeight: 800,
            }}
          >
            <span>↪</span>
            {loggingOut
              ? "جاري تسجيل الخروج..."
              : "تسجيل الخروج"}
          </button>
        </div>
      )}
    </div>
  );
}
