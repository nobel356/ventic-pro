import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const PERMISSIONS = {
  ORDERS_VIEW:"orders.view", ORDERS_EDIT:"orders.edit", ASSIGN_TECH:"orders.assign",
  PRICE_EDIT:"price.edit", QUOTE_SEND:"quote.send", EXTRA_APPROVE:"extra.approve",
  CUSTOMER_SENSITIVE:"customer.sensitive", USERS_MANAGE:"users.manage"
} as const;

export async function currentUser(){
  const jar=await cookies();
  const raw=jar.get("ventic_session")?.value;
  if(!raw) return null;
  const hash=crypto.createHash("sha256").update(raw).digest("hex");
  const session=await prisma.session.findUnique({where:{tokenHash:hash},include:{user:true}});
  if(!session || session.expiresAt < new Date()) return null;
  return session.user;
}
export function can(role:string, permission:string){
  if(role==="SUPER_ADMIN") return true;
  const matrix:Record<string,string[]>={
    ADMIN:["orders.view","orders.edit","orders.assign","price.edit","quote.send","extra.approve","customer.sensitive"],
    CUSTOMER_SERVICE:["orders.view","orders.edit","quote.send","customer.sensitive"],
    TECHNICIAN:["orders.view"]
  };
  return (matrix[role]||[]).includes(permission);
}
export async function requirePermission(permission:string){
  const user=await currentUser();
  if(!user) throw new Error("UNAUTHENTICATED");
  if(!can(user.role,permission)) throw new Error("FORBIDDEN");
  return user;
}
