import {NextResponse} from "next/server";
import crypto from "crypto";
import {prisma} from "@/lib/prisma";
import {currentUser} from "@/lib/auth-v7";
export async function POST(req:Request){
 const user=await currentUser(); if(!user) return NextResponse.json({error:"UNAUTHENTICATED"},{status:401});
 const {orderId,title,reason,amount}=await req.json();
 if(!orderId||!title||!reason||Number(amount)<=0) return NextResponse.json({error:"بيانات التكلفة الإضافية غير مكتملة"},{status:400});
 const token=crypto.randomBytes(24).toString("hex");
 const item=await prisma.extraCharge.create({data:{orderId,title,reason,amount,customerToken:token,requestedById:user.id}});
 await prisma.auditLog.create({data:{action:"EXTRA_CHARGE_REQUESTED",entityType:"Order",entityId:orderId,userId:user.id,newValue:JSON.stringify({title,amount})}} as any);
 return NextResponse.json({id:item.id,approvalPath:`/customer/approval/${token}`});
}
