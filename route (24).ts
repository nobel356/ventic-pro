import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/auth-v7";
export async function POST(req:Request,{params}:{params:Promise<{orderId:string}>}){
 try{
  await requirePermission("orders.edit"); const {orderId}=await params; const {discount=0}=await req.json();
  const o=await prisma.order.findUnique({where:{id:orderId},include:{payments:true}});
  if(!o)return NextResponse.json({error:"الطلب غير موجود"},{status:404});
  const subtotal=Number(o.finalTotal??o.estimatedTotal??0),total=Math.max(0,subtotal-Number(discount));
  const paid=o.payments.filter(x=>x.status==="PAID").reduce((s,x)=>s+Number(x.amount),0);
  const invoiceNo=`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const inv=await prisma.invoice.upsert({where:{orderId},update:{subtotal,discount,total,paid,due:Math.max(0,total-paid)},create:{invoiceNo,orderId,subtotal,discount,total,paid,due:Math.max(0,total-paid)}});
  return NextResponse.json(inv);
 }catch(e:any){return NextResponse.json({error:e.message},{status:403})}
}
