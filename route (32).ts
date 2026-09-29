import {NextResponse} from "next/server";
import crypto from "crypto";
import {prisma} from "@/lib/prisma";

function verify(password:string, stored:string){
  const [salt,key]=stored.split(":");
  if(!salt||!key) return false;
  const test=crypto.scryptSync(password,salt,64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key,"hex"),Buffer.from(test,"hex"));
}
export async function POST(req:Request){
  const {email,password}=await req.json();
  const user=await prisma.user.findUnique({where:{email}});
  if(!user || !(user as any).passwordHash || !verify(password,(user as any).passwordHash))
    return NextResponse.json({error:"بيانات الدخول غير صحيحة"},{status:401});
  const token=crypto.randomBytes(32).toString("hex");
  const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
  await prisma.session.create({data:{tokenHash,userId:user.id,expiresAt:new Date(Date.now()+1000*60*60*24*14)}});
  const res=NextResponse.json({ok:true,role:user.role});
  res.cookies.set("ventic_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*14});
  return res;
}
