"use client";
import {useState} from "react";
import {useParams} from "next/navigation";
export default function Approval(){
 const {token}=useParams<{token:string}>(); const [done,setDone]=useState("");
 async function act(decision:string){const r=await fetch(`/api/customer-approval/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision})});setDone(r.ok?(decision==="accept"?"تمت الموافقة بنجاح":"تم تسجيل الرفض"):"تعذر تنفيذ الطلب");}
 return <main className="order"><section className="panel success"><div className="brand center"><i>V</i> Ventic Pro</div><h1>موافقة العميل</h1><p>راجع تفاصيل عرض السعر أو التكلفة الإضافية المرسلة لك قبل الاختيار.</p>{done?<div className="successBox">{done}</div>:<div className="orderActions"><button className="ghostBtn" onClick={()=>act("reject")}>رفض</button><button className="button" onClick={()=>act("accept")}>موافقة</button></div>}</section></main>
}
