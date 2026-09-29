import {prisma} from "@/lib/prisma";
export default async function Reports(){
 const [orders,completed,revenue,reviews,openComplaints,lowStock]=await Promise.all([
  prisma.order.count(),prisma.order.count({where:{status:"COMPLETED"}}),
  prisma.payment.aggregate({where:{status:"PAID"},_sum:{amount:true}}),
  prisma.review.aggregate({_avg:{overall:true,punctuality:true,professionalism:true,installationQuality:true,cleanliness:true,communication:true,valueForMoney:true},_count:true}),
  prisma.complaint.count({where:{status:{in:["OPEN","SCHEDULED","IN_PROGRESS"]}}}),
  prisma.inventoryItem.findMany({where:{active:true},select:{id:true,nameAr:true,quantity:true,reorderLevel:true}})
 ]);
 const low=lowStock.filter(x=>Number(x.quantity)<=Number(x.reorderLevel));
 return <main className="order"><div className="brand center"><i>V</i> Ventic Pro</div><section className="panel"><h1>التقارير والإحصائيات</h1><div className="grid3"><Card n={orders} t="إجمالي الطلبات"/><Card n={completed} t="طلبات مكتملة"/><Card n={`${Number(revenue._sum.amount||0).toLocaleString("ar-EG")} ج`} t="إيراد محصل"/><Card n={reviews._count} t="عدد التقييمات"/><Card n={(reviews._avg.overall||0).toFixed(1)} t="متوسط التقييم العام"/><Card n={openComplaints} t="شكاوى مفتوحة"/></div><h2 className="sectionTitle">تفاصيل جودة الخدمة</h2><div className="review"><p>الالتزام بالمواعيد: {(reviews._avg.punctuality||0).toFixed(1)} / 5</p><p>احترافية الفني: {(reviews._avg.professionalism||0).toFixed(1)} / 5</p><p>جودة التركيب: {(reviews._avg.installationQuality||0).toFixed(1)} / 5</p><p>النظافة: {(reviews._avg.cleanliness||0).toFixed(1)} / 5</p><p>التواصل: {(reviews._avg.communication||0).toFixed(1)} / 5</p><p>القيمة مقابل السعر: {(reviews._avg.valueForMoney||0).toFixed(1)} / 5</p></div><h2 className="sectionTitle">تنبيه المخزون</h2><p>{low.length?`${low.length} أصناف وصلت لحد إعادة الطلب أو أقل.`:"لا توجد أصناف تحت حد إعادة الطلب."}</p></section></main>
}
function Card({n,t}:{n:string|number,t:string}){return <div className="statCard"><b>{n}</b><span>{t}</span></div>}
