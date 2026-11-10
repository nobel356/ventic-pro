"use client";

import {
  useState,
} from "react";

type Result = {
  label: string;
  path: string;
  status:
    | "PASS"
    | "SKIP"
    | "FAIL";
  http: number;
  detail: string;
};

const checks = [
  {
    label: "Public Blog",
    path: "/blog",
    kind: "public",
  },
  {
    label: "RSS Feed",
    path: "/feed.xml",
    kind: "public",
  },
  {
    label: "Sitemap",
    path: "/sitemap.xml",
    kind: "public",
  },
  {
    label: "Areas API",
    path: "/api/admin/areas",
    kind: "protected",
  },
  {
    label: "Blog CMS API",
    path: "/api/admin/blog",
    kind: "protected",
  },
  {
    label: "Growth Targets API",
    path:
      "/api/admin/growth-targets",
    kind: "protected",
  },
  {
    label: "Growth Reviews API",
    path:
      "/api/admin/growth-reviews",
    kind: "protected",
  },
  {
    label: "Growth Commitments API",
    path:
      "/api/admin/growth-commitments",
    kind: "protected",
  },
  {
    label: "CRO Experiments API",
    path:
      "/api/admin/cro-experiments",
    kind: "protected",
  },
];

export default function AdminSmokeTests() {
  const [results, setResults] =
    useState<Result[]>([]);
  const [running, setRunning] =
    useState(false);

  async function run() {
    setRunning(true);
    setResults([]);

    const next: Result[] =
      [];

    for (const check of checks) {
      try {
        const response =
          await fetch(
            check.path,
            {
              method: "GET",
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        const http =
          response.status;

        if (response.ok) {
          next.push({
            label:
              check.label,
            path:
              check.path,
            status:
              "PASS",
            http,
            detail:
              "Read-only smoke request succeeded.",
          });
        } else if (
          check.kind ===
            "protected" &&
          http === 403
        ) {
          next.push({
            label:
              check.label,
            path:
              check.path,
            status:
              "SKIP",
            http,
            detail:
              "Current admin role is not authorized for this module; 403 is expected.",
          });
        } else {
          next.push({
            label:
              check.label,
            path:
              check.path,
            status:
              "FAIL",
            http,
            detail:
              http === 401
                ? "Unexpected authentication failure."
                : "Unexpected HTTP response.",
          });
        }
      } catch (error: any) {
        next.push({
          label:
            check.label,
          path:
            check.path,
          status:
            "FAIL",
          http: 0,
          detail:
            error?.message ||
            "Network/runtime failure.",
        });
      }

      setResults([
        ...next,
      ]);
    }

    setRunning(false);
  }

  const failed =
    results.filter(
      (item) =>
        item.status === "FAIL",
    ).length;

  return (
    <div
      dir="rtl"
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div style={head}>
        <div>
          <h1
            style={{
              margin:
                "0 0 6px",
              color:
                "#071a2b",
            }}
          >
            Authenticated Smoke Tests
          </h1>
          <p style={muted}>
            الاختبار يستخدم Session الأدمن الحالية ويعمل GET فقط. 403 في Module غير مصرح لك بها تعتبر SKIP، وليس FAIL.
          </p>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() =>
            void run()
          }
          style={button}
        >
          {running
            ? "Running..."
            : "Run Smoke Tests"}
        </button>
      </div>

      {results.length >
        0 && (
        <div
          style={{
            ...summary,
            ...(failed > 0
              ? {
                  background:
                    "#fef2f2",
                  color:
                    "#991b1b",
                }
              : {
                  background:
                    "#f0fdf4",
                  color:
                    "#166534",
                }),
          }}
        >
          {failed > 0
            ? `${failed} test(s) failed.`
            : "No unexpected failures detected."}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {results.map(
          (item) => (
            <div
              key={
                item.path
              }
              style={row}
            >
              <div>
                <strong>
                  {
                    item.label
                  }
                </strong>
                <div
                  style={{
                    color:
                      "#64748b",
                    fontSize: 12,
                  }}
                >
                  {item.path} · HTTP{" "}
                  {item.http}
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                }}
              >
                <span
                  style={{
                    ...pill,
                    ...(item.status ===
                    "PASS"
                      ? {
                          background:
                            "#f0fdf4",
                          color:
                            "#166534",
                        }
                      : item.status ===
                          "SKIP"
                        ? {
                            background:
                              "#eff6ff",
                            color:
                              "#1d4ed8",
                          }
                        : {
                            background:
                              "#fef2f2",
                            color:
                              "#991b1b",
                          }),
                  }}
                >
                  {
                    item.status
                  }
                </span>
                <small>
                  {
                    item.detail
                  }
                </small>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const head: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
  maxWidth: 900,
};
const button: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  minHeight: 40,
  padding: "8px 12px",
  background: "#0b2f49",
  color: "white",
  fontWeight: 900,
};
const summary: React.CSSProperties = {
  borderRadius: 10,
  padding: 10,
};
const row: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 12,
  padding: 11,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
