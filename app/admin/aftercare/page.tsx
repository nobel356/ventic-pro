import {prisma} from "@/lib/prisma";
export default async function Aftercare(){
 const [w,c,m]=await Promise.all([prisma.warranty.count({where:{status:"ACTIVE"}}),prisma.complaint.count({where:{status:{in:["OPEN","SCHEDULED","IN_PROGRESS"]}}}),prisma.maintenanceRequest.count({where:{status:{in:["OPEN","SCHEDULED","IN_PROGRESS"]}}})]);
 return <main className="order"><div className="brand center"><i>V</i> Ventic Pro</div><section className="panel"><h1>ما بعد التركيب</h1><p>متابعة الضمان والصيانة والشكاوى وإعادة الزيارة.</p><div className="grid3"><div className="statCard"><b>{w}</b><span>ضمان نشط</span></div><div className="statCard"><b>{m}</b><span>طلبات صيانة مفتوحة</span></div><div className="statCard"><b>{c}</b><span>شكاوى مفتوحة</span></div></div><p className="notice">جدولة الفنيين تستخدم فحص تعارض على مستوى الـAPI قبل إنشاء الموعد.</p></section></main>
}
