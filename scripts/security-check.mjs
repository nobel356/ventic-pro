const failures = [];
const warnings = [];

const production =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const authSecret = String(
  process.env.AUTH_SECRET || "",
);

if (!authSecret) {
  failures.push("AUTH_SECRET is missing");
} else if (authSecret.length < 32) {
  warnings.push(
    "AUTH_SECRET is shorter than 32 characters; use a long random secret before wide launch.",
  );
}

if (
  production &&
  String(
    process.env.OTP_STAGING_VISIBLE || "false",
  ).toLowerCase() === "true"
) {
  failures.push(
    "OTP_STAGING_VISIBLE must not be true in production",
  );
}

if (
  production &&
  String(
    process.env.PASSWORD_RESET_STAGING_VISIBLE ||
      "false",
  ).toLowerCase() === "true"
) {
  failures.push(
    "PASSWORD_RESET_STAGING_VISIBLE must not be true in production",
  );
}

if (
  production &&
  String(
    process.env.MESSAGING_PROVIDER || "disabled",
  ).toLowerCase() === "disabled"
) {
  warnings.push(
    "MESSAGING_PROVIDER is disabled; production OTP delivery will not work until V12B messaging is configured.",
  );
}

if (
  production &&
  String(
    process.env.STORAGE_PROVIDER || "disabled",
  ).toLowerCase() === "disabled"
) {
  warnings.push(
    "STORAGE_PROVIDER is disabled; persistent production image storage is still pending V12B.",
  );
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }
  process.exit(1);
}

console.log("Ventic Pro security environment check passed.");
