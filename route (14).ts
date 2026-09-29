import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/auth-v7";
import {audit} from "@/lib/audit";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 try{const user=await requirePermission("quote.send");const {id}=await params;const e=await prisma.venticEstimate.findUnique({where:{id}});if(!e)return NextResponse.json({error:"المقايسة غير موجودة"},{status:404});if(e.status!=="DRAFT")return NextResponse.json({error:"المقايسة ليست مسودة"},{status:409});const u=await prisma.venticEstimate.update({where:{id},data:{status:"SENT",sentAt:new Date()}});await audit({orderId:e.orderId,actorId:user.id,actorLabel:user.name,action:"VENTIC_ESTIMATE_SENT",newValue:{version:e.version,total:Number(e.total)}});return NextResponse.json({approvalPath:`/customer/estimate/${u.customerToken}`});}catch(e:any){return NextResponse.json({error:e.message},{status:e.message==="UNAUTHENTICATED"?401:403})}
}
