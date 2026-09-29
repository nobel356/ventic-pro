import {cookies} from 'next/headers';import {prisma} from './prisma';
export const TECH_COOKIE='ventic_tech';
export async function currentTechnician(){const c=await cookies();const id=c.get(TECH_COOKIE)?.value||process.env.DEMO_TECHNICIAN_ID;if(!id)return null;return prisma.user.findFirst({where:{id,role:'TECHNICIAN',active:true}})}
