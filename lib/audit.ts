import {prisma} from './prisma';
export async function audit(data:{orderId?:string;actorId?:string;actorLabel:string;action:string;oldValue?:unknown;newValue?:unknown}){return prisma.auditLog.create({data:{...data,oldValue:data.oldValue as any,newValue:data.newValue as any}})}
