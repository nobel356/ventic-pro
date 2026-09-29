import {NextResponse} from "next/server";
import crypto from "crypto";
import {prisma} from "@/lib/prisma";
import {requirePermission,PERMISSIONS} from "@/lib/auth-v7";
export async function POST(req:Request){
 try{
  const user=await requirePermission(PERMISSIONS.QUOTE_SEND);
  const {orderId,amount,notes}=await req.json();
  const token=crypto.randomBytes(24).toString("hex");
  const q=await prisma.quote.create({data:{orderId,amount,notes,status:"SENT",customerToken:token,sentAt:new Date()}});
  await prisma.auditLog.create({data:{action:"QUOTE_SENT",entityType:"Order",entityId:orderId,userId:user.id,newValue:JSON.stringify({amount,qid:q.id})}} as any);
  return NextResponse.json({id:q.id,approvalPath:`/customer/approval/${token}`});
 }catch(e:any){return NextResponse.json({error:e.message},{status:e.message==="FORBIDDEN"?403:401})}
}
