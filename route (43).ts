import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){
  try{
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ok:true,database:"ok",storage:process.env.STORAGE_PROVIDER||"disabled",messaging:process.env.MESSAGING_PROVIDER||"disabled"});
  }catch{
    return NextResponse.json({ok:false,database:"error"},{status:503});
  }
}
