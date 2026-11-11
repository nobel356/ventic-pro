export type VentilationRouteClass =
  | "LOW_RESISTANCE"
  | "MEDIUM_RESISTANCE"
  | "HIGH_RESISTANCE";

export type VentilationAdvisorInput = {
  ductLengthM: number;
  elbows90: number;
  areaM2?: number;
  ceilingHeightM?: number;
  targetAch?: number;
};

export type VentilationAdvisorResult = {
  routeClass: VentilationRouteClass;
  routeLabel: string;
  recommendation: string;
  caution: string;
  roomVolumeM3: number | null;
  designAirflowM3h: number | null;
};

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function ventilationAdvisor(
  input: VentilationAdvisorInput,
): VentilationAdvisorResult {
  const ductLengthM = finiteNonNegative(input.ductLengthM);
  const elbows90 = Math.floor(
    finiteNonNegative(input.elbows90),
  );

  let routeClass: VentilationRouteClass =
    "LOW_RESISTANCE";

  if (ductLengthM > 5 || elbows90 >= 3) {
    routeClass = "HIGH_RESISTANCE";
  } else if (
    ductLengthM > 2 ||
    elbows90 >= 2
  ) {
    routeClass = "MEDIUM_RESISTANCE";
  }

  const routeText = {
    LOW_RESISTANCE:
      "مسار قصير ومقاومته المتوقعة منخفضة نسبيًا",
    MEDIUM_RESISTANCE:
      "مسار متوسط ويحتاج مراجعة منحنى الأداء مع الضغط",
    HIGH_RESISTANCE:
      "مسار طويل/معقد ولا يصح اختيار المروحة على تدفق الهواء الحر فقط",
  } satisfies Record<
    VentilationRouteClass,
    string
  >;

  const recommendationText = {
    LOW_RESISTANCE:
      "قد يكون الشفاط المباشر أو حل قصير الدكت مناسبًا، بشرط مطابقة التدفق والضوضاء وفتحة الخروج.",
    MEDIUM_RESISTANCE:
      "الأفضل مقارنة مروحة لها منحنى Airflow/Static Pressure منشور؛ inline أو mixed-flow قد يكون أنسب من axial بسيط حسب التصميم.",
    HIGH_RESISTANCE:
      "يُفضّل حل قادر على ضغط ساكن أعلى، وغالبًا inline/centrifugal بعد حساب فاقد الضغط الفعلي للدكت والأكواع.",
  } satisfies Record<
    VentilationRouteClass,
    string
  >;

  const area =
    typeof input.areaM2 === "number" &&
    Number.isFinite(input.areaM2) &&
    input.areaM2 > 0
      ? input.areaM2
      : null;

  const height =
    typeof input.ceilingHeightM === "number" &&
    Number.isFinite(input.ceilingHeightM) &&
    input.ceilingHeightM > 0
      ? input.ceilingHeightM
      : null;

  const roomVolumeM3 =
    area !== null && height !== null
      ? Number((area * height).toFixed(2))
      : null;

  const ach =
    typeof input.targetAch === "number" &&
    Number.isFinite(input.targetAch) &&
    input.targetAch > 0
      ? input.targetAch
      : null;

  const designAirflowM3h =
    roomVolumeM3 !== null && ach !== null
      ? Number(
          (roomVolumeM3 * ach).toFixed(1),
        )
      : null;

  return {
    routeClass,
    routeLabel: routeText[routeClass],
    recommendation:
      recommendationText[routeClass],
    caution:
      "النتيجة إرشادية وليست تصميمًا ميكانيكيًا نهائيًا. الاختيار النهائي يحتاج بيانات المروحة الفعلية وقطر الدكت وطوله والأكواع والفتحات وفاقد الضغط، ومع المشاريع الخاصة تُراجع متطلبات الكود/المهندس المصمم.",
    roomVolumeM3,
    designAirflowM3h,
  };
}
