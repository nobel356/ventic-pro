import { prisma } from "@/lib/prisma";

export type CroVariant = "CONTROL" | "VARIANT";

export function addQuery(
  href: string,
  params: Record<string, string>,
) {
  const joiner =
    href.includes("?") ? "&" : "?";

  const query =
    Object.entries(params)
      .map(
        ([key, value]) =>
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(value),
      )
      .join("&");

  return href + joiner + query;
}

export async function getRunningExperiment(
  articleSlug: string,
) {
  const now = new Date();

  return prisma.croExperiment.findFirst({
    where: {
      articleSlug,
      status: "RUNNING",
      startedAt: {
        lte: now,
      },
      OR: [
        { endsAt: null },
        { endsAt: { gt: now } },
      ],
    },
    orderBy: {
      startedAt: "desc",
    },
  });
}

function normalCdf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + 0.3275911 * abs);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const erf =
    sign *
    (
      1 -
      (
        (
          (
            (
              a5 * t + a4
            ) *
              t +
            a3
          ) *
            t +
          a2
        ) *
          t +
        a1
      ) *
        t *
        Math.exp(-abs * abs)
    );

  return 0.5 * (1 + erf);
}

export function twoProportionPValue(
  controlSuccess: number,
  controlTotal: number,
  variantSuccess: number,
  variantTotal: number,
) {
  if (
    controlTotal <= 0 ||
    variantTotal <= 0
  ) {
    return 1;
  }

  const p1 =
    controlSuccess /
    controlTotal;
  const p2 =
    variantSuccess /
    variantTotal;
  const pooled =
    (controlSuccess +
      variantSuccess) /
    (controlTotal +
      variantTotal);

  const se =
    Math.sqrt(
      pooled *
        (1 - pooled) *
        (
          1 / controlTotal +
          1 / variantTotal
        ),
    );

  if (!Number.isFinite(se) || se === 0) {
    return 1;
  }

  const z =
    Math.abs(
      (p2 - p1) / se,
    );

  const p =
    2 *
    (1 - normalCdf(z));

  return Math.max(
    0,
    Math.min(1, p),
  );
}

export function summarizeExperiment(input: {
  controlExposures: number;
  controlClicks: number;
  controlOrders: number;
  variantExposures: number;
  variantClicks: number;
  variantOrders: number;
}) {
  const controlCtr =
    input.controlExposures > 0
      ? input.controlClicks /
        input.controlExposures
      : 0;

  const variantCtr =
    input.variantExposures > 0
      ? input.variantClicks /
        input.variantExposures
      : 0;

  const pValue =
    twoProportionPValue(
      input.controlClicks,
      input.controlExposures,
      input.variantClicks,
      input.variantExposures,
    );

  const enoughSample =
    input.controlExposures >= 50 &&
    input.variantExposures >= 50 &&
    (
      input.controlClicks +
      input.variantClicks
    ) >= 10;

  const significant =
    enoughSample &&
    pValue < 0.05;

  const winner =
    significant
      ? variantCtr >
        controlCtr
        ? "VARIANT"
        : "CONTROL"
      : null;

  const uplift =
    controlCtr > 0
      ? (
          (variantCtr -
            controlCtr) /
          controlCtr
        ) *
        100
      : variantCtr > 0
        ? 100
        : 0;

  return {
    controlCtr:
      Number(
        (
          controlCtr * 100
        ).toFixed(1),
      ),
    variantCtr:
      Number(
        (
          variantCtr * 100
        ).toFixed(1),
      ),
    uplift:
      Number(
        uplift.toFixed(1),
      ),
    pValue:
      Number(
        pValue.toFixed(4),
      ),
    enoughSample,
    significant,
    winner,
  };
}
