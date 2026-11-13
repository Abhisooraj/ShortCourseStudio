"use client";
import {useState} from "react";
type Checkout=new (options:Record<string,unknown>)=>{open:()=>void;on:(event:string, cb:()=>void)=>void};
async function post<T extends object>(path:string,body:unknown){
 const res=await fetch("/api/payments/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await res.json() as T&{error?:string};if(!res.ok)throw new Error(data.error??"Payment service unavailable.");return data;
}
async function loadCheckout(){
 const w=window as Window & {Razorpay?:Checkout};
 if(!w.Razorpay)await new Promise<void>((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error("Could not load checkout."));};document.head.appendChild(script);
 });
 if(!w.Razorpay)throw new Error("Checkout is unavailable.");return w.Razorpay;
}
export default function PaymentCheckout({id,token,mode}:{id:string;token:string;mode:"test"|"live"}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const ref={id,token};
 async function start(){
  setBusy(true);setError("");
  try{
   const o=await post<{paymentState?:string;key?:string;amount?:number;orderId?:string;course?:string}>("order",ref);
   if(o.paymentState){location.reload();return;}
   const Razorpay=await loadCheckout();
   const instance=new Razorpay({key:o.key,order_id:o.orderId,amount:o.amount,currency:"INR",name:"GL Bajaj CSAI Short-Term Courses",description:o.course,theme:{color:"#174a3d"},modal:{ondismiss:()=>setBusy(false)},handler:async(payload:Record<string,string>)=>{
    try{const p=await post<{paymentState:string}>("verify",{...ref,...payload});if(p.paymentState==="pending")setError("Payment is awaiting confirmation. Refresh the status shortly.");else location.reload();}
    catch(e){setError(e instanceof Error?e.message:"Could not verify payment.");}finally{setBusy(false);}
   }});
   instance.on("payment.failed",()=>{setError("Payment did not complete. Refresh the status before retrying.");setBusy(false);});instance.open();
  }catch(e){setError(e instanceof Error?e.message:"Checkout is unavailable.");setBusy(false);}
 }
 return <div>{mode==="test"&&<p>No real money is collected in test mode.</p>}<button type="button" className="btn primary" onClick={start} disabled={busy}>{mode==="test"?"Run test checkout":"Pay course fee"}</button>{error&&<p role="alert" className="error">{error}</p>}</div>;
}
