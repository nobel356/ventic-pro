import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/auth-v7";
export async function POST(req:Request){
 try{
  const user=await requirePermission("orders.edit");
  const {orderId,amount,method,reference}=await req.json();
  if(!orderId||Number(amount)<=0) return NextResponse.json({error:"بيانات الدفع غير صحيحة"},{status:400});
  const p=await prisma.payment.create({data:{orderId,amount,method,reference,receivedById:user.id}});
  const paid=await prisma.payment.aggregate({where:{orderId,status:"PAID"},_sum:{amount:true}});
  const inv=await prisma.invoice.findUnique({where:{orderId}});
  if(inv){const n=Number(paid._sum.amount||0);await prisma.invoice.update({where:{id:inv.id},data:{paid:n,due:Math.max(0,Number(inv.total)-n)}})}
  await prisma.auditLog.create({data:{action:"PAYMENT_RECORDED",entityType:"Order",entityId:orderId,userId:user.id,newValue:JSON.stringify({amount,method})}} as any);
  return NextResponse.json(p);
 }catch(e:any){return NextResponse.json({error:e.message},{status:403})}
}
