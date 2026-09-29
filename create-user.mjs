import crypto from "crypto";
import {PrismaClient} from "@prisma/client";
const prisma=new PrismaClient();
const [,,email,password,role="ADMIN",name="Ventic Admin"]=process.argv;
if(!email||!password) throw new Error("Usage: node scripts/create-user.mjs email password ADMIN");
const salt=crypto.randomBytes(16).toString("hex");
const key=crypto.scryptSync(password,salt,64).toString("hex");
await prisma.user.upsert({where:{email},update:{name,role,passwordHash:`${salt}:${key}`},create:{email,name,role,passwordHash:`${salt}:${key}`}});
console.log("User ready:",email,role); await prisma.$disconnect();
