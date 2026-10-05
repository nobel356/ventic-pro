import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email =
  process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password =
  process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD. Seed is manual in V12A.",
  );
  process.exit(1);
}

if (password.length < 6) {
  console.error(
    "SEED_ADMIN_PASSWORD must be at least 6 characters",
  );
  process.exit(1);
}

const existing = await prisma.user.findUnique({
  where: { email },
});

if (!existing) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  const passwordHash = `${salt}:${key}`;

  await prisma.user.create({
    data: {
      email,
      name: "Ventic Owner",
      role: "SUPER_ADMIN",
      passwordHash,
      active: true,
    },
  });

  console.log(`Seed created initial owner ${email}`);
} else {
  // Never reset a live owner's password just because seed was run again.
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log(
    `Seed found existing owner ${email}; password was NOT changed.`,
  );
}

const services = [
  ["BATH_NEW", "تركيب بلاور حمام جديد", "FIXED", 350],
  ["BATH_REPLACE", "استبدال بلاور حمام", "FIXED", 400],
  ["BATH_INSTALL_ONLY", "تركيب بلاور العميل", "FIXED", 300],
  ["KITCHEN_FAN", "تركيب بلاور مطبخ", "FIXED", 400],
  ["HOOD", "تركيب هود", "FIXED", 500],
  ["HOOD_INSTALL", "تركيب هود", "FIXED", 500],
  ["DUCT_METER", "خط طرد بالمتر", "PER_METER", 250],
  ["EXTERNAL_FAN", "تركيب مروحة طرد خارجية", "FIXED", 500],
];

for (const [code, nameAr, pricingType, priceFrom] of services) {
  await prisma.service.upsert({
    where: { code },
    update: {
      nameAr,
      pricingType,
      priceFrom,
    },
    create: {
      code,
      nameAr,
      pricingType,
      priceFrom,
    },
  });
}

await prisma.$disconnect();
