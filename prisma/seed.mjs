import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
  process.exit(1);
}
if (password.length < 6) {
  console.error("SEED_ADMIN_PASSWORD must be at least 6 characters");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const key = crypto.scryptSync(password, salt, 64).toString("hex");
const passwordHash = `${salt}:${key}`;

await prisma.user.upsert({
  where: { email },
  update: { role: "SUPER_ADMIN", passwordHash },
  create: { email, name: "Ventic Owner", role: "SUPER_ADMIN", passwordHash },
});

const services = [
  ["BATH_NEW", "تركيب بلاور حمام جديد", "FIXED", 350],
  ["BATH_REPLACE", "استبدال بلاور حمام", "FIXED", 400],
  ["KITCHEN_FAN", "تركيب بلاور مطبخ", "FIXED", 400],
  ["HOOD_INSTALL", "تركيب هود", "FIXED", 500],
  ["DUCT_METER", "خط طرد بالمتر", "PER_METER", 250],
  ["EXTERNAL_FAN", "تركيب مروحة طرد خارجية", "FIXED", 500],
];

for (const [code, nameAr, pricingType, priceFrom] of services) {
  await prisma.service.upsert({
    where: { code },
    update: { nameAr, pricingType, priceFrom },
    create: { code, nameAr, pricingType, priceFrom },
  });
}

console.log(`Seed complete for ${email}`);
await prisma.$disconnect();
