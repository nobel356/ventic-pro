import {NextResponse} from "next/server";import {prisma} from "@/lib/prisma";
export async function POST(req:Request){const {orderId,warrantyId,issue}=await req.json();if(!orderId||!issue)return NextResponse.json({error:"بيانات ناقصة"},{status:400});return NextResponse.json(await prisma.maintenanceRequest.create({data:{orderId,warrantyId,issue}}))}
