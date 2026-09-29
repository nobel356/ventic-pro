import {NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';
export async function GET(){return NextResponse.json(await prisma.user.findMany({where:{role:'TECHNICIAN',active:true},orderBy:{name:'asc'}}))}
export async function POST(req:Request){const b=await req.json();if(!b.name||!b.email)return NextResponse.json({error:'الاسم والبريد مطلوبان'},{status:400});return NextResponse.json(await prisma.user.create({data:{name:b.name,email:b.email,role:'TECHNICIAN'}}))}
