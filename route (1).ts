import {NextResponse} from "next/server";
import crypto from "crypto";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/auth-v7";
import {audit} from "@/lib/audit";
export async function POST(req:Request){
 try{
  const user=await requirePermission("orders.edit");
  const {orderId}=await req.json();
  const order=await prisma.order.findUnique({where:{id:orderId},include:{spaces:{include:{services:true}},venticEstimates:{orderBy:{version:"desc"},take:1}}});
  if(!order)return NextResponse.json({error:"الطلب غير موجود"},{status:404});
  const version=(order.venticEstimates[0]?.version||0)+1;
  const previous=order.venticEstimates[0] ? await prisma.venticEstimate.findUnique({where:{id:order.venticEstimates[0].id},include:{items:{orderBy:{sortOrder:"asc"}}}}) : null;
  const source=previous?.items?.length ? previous.items.map((x,i)=>({description:x.description,unit:x.unit,qty:x.qty,unitPrice:x.unitPrice,sortOrder:i})) : order.spaces.flatMap(s=>s.services).map((x,i)=>({description:x.serviceNameSnapshot,unit:"وحدة",qty:x.qty,unitPrice:x.unitPriceSnapshot,sortOrder:i}));
  const subtotal=source.reduce((n,x)=>n+Number(x.qty)*Number(x.unitPrice),0);
  const estimate=await prisma.venticEstimate.create({data:{orderId,version,subtotal,total:subtotal,customerToken:crypto.randomBytes(24).toString("hex"),items:{create:source}},include:{items:true}});
  await audit({orderId,actorId:user.id,actorLabel:user.name,action:"VENTIC_ESTIMATE_CREATED",newValue:{estimateId:estimate.id,version,total:subtotal}});
  return NextResponse.json(estimate);
 }catch(e:any){return NextResponse.json({error:e.message},{status:e.message==="UNAUTHENTICATED"?401:403})}
}
