"use client";

import {
  useEffect,
  useState,
} from "react";

type ArchiveType =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

let statusPromise:
  | Promise<any>
  | null = null;

function getStatus() {
  if (!statusPromise) {
    statusPromise = fetch(
      "/api/admin/archive/status",
      { cache: "no-store" },
    ).then(async (response) => {
      const data = await response.json();
      return response.ok ? data : null;
    });
  }

  return statusPromise;
}

export default function InlineArchiveButton({
  type,
  id,
  label,
  onArchived,
}: {
  type: ArchiveType;
  id: string;
  label: string;
  onArchived?: () => void | Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    void getStatus().then((status) => {
      if (alive) {
        setVisible(
          Boolean(status?.canArchive),
        );
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  if (!visible) return null;

  async function doArchive() {
    return fetch(
      `/api/admin/archive/${type}/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        // السبب لم يعد جزءًا من تجربة المستخدم.
        // القيمة الداخلية فقط للتوافق مع API الحالي.
        body: JSON.stringify({
          reason: "بدون سبب",
        }),
      },
    );
  }

  async function run() {
    if (
      !window.confirm(
        `نقل ${label} إلى Archive Vault؟`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      let response =
        await doArchive();
      let data =
        await response.json();

      if (
        !response.ok &&
        String(
          data?.error || "",
        ).includes(
          "ARCHIVE_VAULT_LOCKED",
        )
      ) {
        const password =
          window.prompt(
            "Archive Vault مقفول. اكتب كلمة سر الأرشيف للمتابعة:",
          );

        if (!password) return;

        const unlock =
          await fetch(
            "/api/admin/archive/unlock",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  password,
                }),
            },
          );

        const unlockData =
          await unlock.json();

        if (!unlock.ok) {
          throw new Error(
            unlockData?.error ||
              "كلمة سر الأرشيف غير صحيحة.",
          );
        }

        statusPromise = null;
        response =
          await doArchive();
        data =
          await response.json();
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر الأرشفة.",
        );
      }

      await onArchived?.();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "تعذر الأرشفة.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      style={{
        minHeight: 38,
        border:
          "1px solid #fed7aa",
        borderRadius: 9,
        background: "#fff7ed",
        color: "#9a3412",
        padding: "0 11px",
        fontWeight: 900,
        cursor: busy
          ? "wait"
          : "pointer",
      }}
    >
      {busy
        ? "جاري..."
        : "أرشفة"}
    </button>
  );
}
