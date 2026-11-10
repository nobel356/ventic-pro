"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Experiment = {
  id: string;
  controlLabel: string;
  variantLabel: string;
};

const SESSION_KEY =
  "vp_blog_session";

function getSessionId() {
  try {
    const existing =
      sessionStorage.getItem(
        SESSION_KEY,
      );

    if (existing) {
      return existing;
    }

    const next =
      typeof crypto !==
        "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random()
            .toString(36)
            .slice(2) +
          Date.now().toString(36);

    sessionStorage.setItem(
      SESSION_KEY,
      next,
    );

    return next;
  } catch {
    return (
      "cro-" +
      Math.random()
        .toString(36)
        .slice(2)
    );
  }
}

function stableBucket(
  value: string,
) {
  let hash = 2166136261;

  for (
    let i = 0;
    i < value.length;
    i += 1
  ) {
    hash ^=
      value.charCodeAt(i);
    hash =
      Math.imul(
        hash,
        16777619,
      );
  }

  return (
    Math.abs(hash) % 100
  );
}

function withContent(
  href: string,
  experimentId: string,
  variant:
    | "CONTROL"
    | "VARIANT",
) {
  const joiner =
    href.includes("?")
      ? "&"
      : "?";

  return (
    href +
    joiner +
    "utm_content=" +
    encodeURIComponent(
      "cro:" +
        experimentId +
        ":" +
        variant,
    )
  );
}

async function sendEvent(
  experimentId: string,
  variant:
    | "CONTROL"
    | "VARIANT",
  eventType:
    | "EXPOSURE"
    | "CLICK",
  sessionId: string,
) {
  const body =
    JSON.stringify({
      experimentId,
      variant,
      eventType,
      sessionId,
    });

  if (
    navigator.sendBeacon
  ) {
    navigator.sendBeacon(
      "/api/blog/experiment/event",
      new Blob(
        [body],
        {
          type:
            "application/json",
        },
      ),
    );
    return;
  }

  void fetch(
    "/api/blog/experiment/event",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body,
      keepalive: true,
    },
  );
}

export default function ExperimentServiceCta({
  href,
  fallbackLabel,
  experiment,
}: {
  href: string;
  fallbackLabel: string;
  experiment:
    | Experiment
    | null;
}) {
  const [
    sessionId,
    setSessionId,
  ] = useState("");

  useEffect(() => {
    setSessionId(
      getSessionId(),
    );
  }, []);

  const variant =
    useMemo(() => {
      if (
        !experiment ||
        !sessionId
      ) {
        return "CONTROL" as const;
      }

      return stableBucket(
        sessionId +
          "|" +
          experiment.id,
      ) < 50
        ? ("CONTROL" as const)
        : ("VARIANT" as const);
    }, [
      experiment,
      sessionId,
    ]);

  useEffect(() => {
    if (
      !experiment ||
      !sessionId
    ) {
      return;
    }

    void sendEvent(
      experiment.id,
      variant,
      "EXPOSURE",
      sessionId,
    );
  }, [
    experiment,
    sessionId,
    variant,
  ]);

  const label =
    !experiment
      ? fallbackLabel
      : variant === "CONTROL"
        ? experiment.controlLabel
        : experiment.variantLabel;

  const finalHref =
    experiment
      ? withContent(
          href,
          experiment.id,
          variant,
        )
      : href;

  return (
    <a
      className="button"
      href={finalHref}
      data-blog-event="SERVICE_CLICK"
      data-blog-target={href}
      onClick={() => {
        if (
          experiment &&
          sessionId
        ) {
          void sendEvent(
            experiment.id,
            variant,
            "CLICK",
            sessionId,
          );
        }
      }}
    >
      {label}
    </a>
  );
}
