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

async function canArchive() {
  if (!statusPromise) {
    statusPromise = fetch(
      "/api/admin/archive/status",
      { cache: "no-store" },
    )
      .then(async (response) => {
        const data =
          await response.json();
        return response.ok
          ? Boolean(
              data?.canArchive,
            )
          : false;
      })
      .catch(() => false);
  }

  return statusPromise;
}

export default function BulkArchiveButton({
  type,
  ids,
  onDone,
}: {
  type: ArchiveType;
  ids: string[];
  onDone?: () =>
    | void
    | Promise<void>;
}) {
  const [visible, setVisible] =
    useState(false);
  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    let active = true;

    void canArchive().then(
      (allowed) => {
        if (active) {
          setVisible(
            allowed,
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  if (!visible) return null;

  async function run() {
    if (!ids.length) return;

    if (
      !window.confirm(
        `أرشفة ${ids.length.toLocaleString("ar-EG")} عنصر محدد؟`,
      )
    ) {
      return;
    }

    setBusy(true);

    const failed: string[] =
      [];

    try {
      for (const id of ids) {
        const response =
          await fetch(
            `/api/admin/archive/${type}/${id}`,
            {
              method:
                "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({}),
            },
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          failed.push(
            data?.error ||
              id,
          );
        }
      }

      if (failed.length) {
        window.alert(
          `تم تنفيذ العملية مع ${failed.length.toLocaleString("ar-EG")} خطأ:\n\n${failed
            .slice(0, 8)
            .join("\n")}`,
        );
      }

      await onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={
        busy ||
        ids.length === 0
      }
      onClick={() =>
        void run()
      }
      style={{
        minHeight: 40,
        border:
          "1px solid #fed7aa",
        borderRadius: 10,
        background: "#fff7ed",
        color: "#9a3412",
        padding: "0 13px",
        fontWeight: 900,
        cursor:
          busy ||
          ids.length === 0
            ? "not-allowed"
            : "pointer",
        opacity:
          ids.length === 0
            ? 0.55
            : 1,
      }}
    >
      {busy
        ? "جاري الأرشفة..."
        : `أرشفة المحدد (${ids.length})`}
    </button>
  );
}
