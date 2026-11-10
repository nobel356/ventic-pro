import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const cwd = process.cwd();

for (const file of [".env", ".env.local"]) {
  const full = path.join(cwd, file);

  if (fs.existsSync(full)) {
    loadEnv({
      path: full,
      override: file === ".env.local",
    });
  }
}

// Prisma schema references DIRECT_URL.
// Some local developer environments only define DATABASE_URL.
// For CLI validation/generation only, safely fall back to DATABASE_URL.
// Production environment variables are not changed by this.
if (
  !process.env.DIRECT_URL &&
  process.env.DATABASE_URL
) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
});
