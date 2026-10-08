type SafeDiagnosticValue =
  | string
  | number
  | boolean
  | null
  | undefined;

function redactText(
  value: string,
) {
  return value
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[masked-email]",
    )
    .replace(
      /\b(?:sk|re|key|token|secret)[-_A-Za-z0-9.]{12,}\b/gi,
      "[masked-secret]",
    )
    .replace(
      /\b\d{6}\b/g,
      "[masked-code]",
    )
    .slice(0, 240);
}

function cleanValue(
  value: SafeDiagnosticValue,
) {
  if (
    value === null ||
    value === undefined ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value ?? null;
  }

  return redactText(
    String(value),
  );
}

export function safeDiagnostic(
  event: string,
  fields: Record<
    string,
    SafeDiagnosticValue
  > = {},
) {
  const safeFields =
    Object.fromEntries(
      Object.entries(
        fields,
      ).map(
        ([key, value]) => [
          key,
          cleanValue(
            value,
          ),
        ],
      ),
    );

  console.info(
    "[VP_DIAG]",
    redactText(event),
    safeFields,
  );
}

export function safeDiagnosticError(
  event: string,
  error: unknown,
  fields: Record<
    string,
    SafeDiagnosticValue
  > = {},
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error || "");

  safeDiagnostic(
    `${event}:error`,
    {
      ...fields,
      error:
        redactText(message),
    },
  );
}

export function redactDiagnosticText(
  value: unknown,
) {
  return redactText(
    String(value || ""),
  );
}
