import {NextResponse} from "next/server";
import crypto from "crypto";
import {cookies} from "next/headers";
import {prisma} from "@/lib/prisma";
export async function POST(){
 const jar=await cookies(); const raw=jar.get("ventic_session")?.value;
 if(raw){const hash=crypto.createHash("sha256").update(raw).digest("hex");await prisma.session.deleteMany({where:{tokenHash:hash}})}
 const r=NextResponse.json({ok:true});r.cookies.set("ventic_session","",{path:"/",maxAge:0});return r;
}
