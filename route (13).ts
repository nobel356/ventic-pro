import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/auth-v7";
import {audit} from "@/lib/audit";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const user=await requirePermission("orders.edit"); const {id}=await params; const body=await req.json();
  const old=await prisma.venticEstimate.findUnique({where:{id},include:{items:true}});
  if(!old)return NextResponse.json({error:"المقايسة غير موجودة"},{status:404});
  if(old.status!=="DRAFT")return NextResponse.json({error:"لا يمكن تعديل مقايسة تم إرسالها. أنشئ إصدارًا جديدًا."},{status:409});
  const items=(body.items||[]).filter((x:any)=>x.description&&Number(x.qty)>0&&Number(x.unitPrice)>=0);
  const subtotal=items.reduce((n:number,x:any)=>n+Number(x.qty)*Number(x.unitPrice),0); const discount=Math.max(0,Number(body.discount||0)); const total=Math.max(0,subtotal-discount);
  const updated=await prisma.$transaction(async tx=>{await tx.venticEstimateItem.deleteMany({where:{estimateId:id}});return tx.venticEstimate.update({where:{id},data:{notes:body.notes||null,subtotal,discount,total,items:{create:items.map((x:any,i:number)=>({description:x.description,unit:x.unit||"وحدة",qty:Number(x.qty),unitPrice:Number(x.unitPrice),sortOrder:i}))}},include:{items:true}})});
  await audit({orderId:old.orderId,actorId:user.id,actorLabel:user.name,action:"VENTIC_ESTIMATE_UPDATED",oldValue:{total:Number(old.total)},newValue:{total}});
  return NextResponse.json(updated);
 }catch(e:any){return NextResponse.json({error:e.message},{status:e.message==="UNAUTHENTICATED"?401:403})}
}
