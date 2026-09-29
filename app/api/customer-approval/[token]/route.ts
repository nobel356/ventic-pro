import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params; const {decision}=await req.json(); const accepted=decision==="accept";
 const q=await prisma.quote.findUnique({where:{customerToken:token}});
 if(q){await prisma.quote.update({where:{id:q.id},data:{status:accepted?"ACCEPTED":"REJECTED",respondedAt:new Date()}}); if(accepted) await prisma.order.update({where:{id:q.orderId},data:{finalTotal:q.amount}}); return NextResponse.json({ok:true,type:"quote"});}
 const x=await prisma.extraCharge.findUnique({where:{customerToken:token}});
 if(x){await prisma.extraCharge.update({where:{id:x.id},data:{status:accepted?"APPROVED":"REJECTED",respondedAt:new Date()}});return NextResponse.json({ok:true,type:"extra"});}
 return NextResponse.json({error:"الرابط غير صالح"},{status:404});
}
