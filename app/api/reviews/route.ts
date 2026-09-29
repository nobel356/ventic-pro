import {NextResponse} from "next/server";import {prisma} from "@/lib/prisma";
export async function POST(req:Request){
 const x=await req.json(); const fields=["overall","punctuality","professionalism","installationQuality","cleanliness","communication","valueForMoney"];
 if(!x.orderId||fields.some(k=>Number(x[k])<1||Number(x[k])>5)) return NextResponse.json({error:"كل التقييمات يجب أن تكون من 1 إلى 5"},{status:400});
 const order=await prisma.order.findUnique({where:{id:x.orderId}});
 if(!order||order.status!=="COMPLETED") return NextResponse.json({error:"التقييم متاح للطلبات المكتملة فقط"},{status:400});
 try{return NextResponse.json(await prisma.review.create({data:{orderId:x.orderId,technicianId:(order as any).technicianId??null,overall:+x.overall,punctuality:+x.punctuality,professionalism:+x.professionalism,installationQuality:+x.installationQuality,cleanliness:+x.cleanliness,communication:+x.communication,valueForMoney:+x.valueForMoney,arrivalNote:x.arrivalNote,comment:x.comment}}))}
 catch{return NextResponse.json({error:"تم تقييم هذا الطلب بالفعل"},{status:409})}
}
