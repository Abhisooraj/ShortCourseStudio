import { PAISE } from "@/lib/courses";
import { z } from "zod";
import { reserveDiscount } from "@/lib/referrals";
import {cfg,db,getCourses,lookup,paymentMode,authorizedAdmin,secureEqual,signature,getApplication,gateway,markPaid,type Application} from "@/lib/enrollment";
import { createApplication,saveCourse } from "@/lib/form-workflows";
export const dynamic = "force-dynamic";
const ref=z.object({id:z.string().max(30),token:z.string().max(80)});
const checkout=ref.extend({referralCode:z.string().trim().toUpperCase().regex(/^(?:REF-[A-F0-9]{16})?$/).default(""),wallet:z.boolean().default(false)});
const verify=ref.extend({razorpay_order_id:z.string().regex(/^order_[A-Za-z0-9]{5,40}$/),razorpay_payment_id:z.string().regex(/^pay_[A-Za-z0-9]{5,40}$/),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/)});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const fail=(error:string,status:number)=>reply({error},status);
async function rawBody(req:Request){
 const reader=req.body?.getReader();if(!reader)return "";
 const decoder=new TextDecoder();let s="",size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>40000){await reader.cancel();throw new Error("body");}s+=decoder.decode(part.value,{stream:true});}return s+decoder.decode();}
 finally{reader.releaseLock();}
}
export async function GET(req:Request){
 const path=new URL(req.url).pathname;
 if(path!=="/api/admin")return fail("Not found.",404);
 if(!await authorizedAdmin(req))return fail(cfg.ADMIN_PASSWORD?"Admin access denied.":"Admin password has not been configured.",401);
 try{
  const records=(await db().prepare("SELECT id, slug, batch, name, email, college, created_at, payment_state, payment_id FROM applications ORDER BY created_at DESC LIMIT 500").all()).results;
  return reply({courses:await getCourses(),records,paymentMode:paymentMode()});
 }catch{return fail("The admin data is temporarily unavailable.",503);}
}
export async function POST(req:Request){
 const url=new URL(req.url), path=url.pathname;
 const webhook=path==="/api/payments/webhook";
 if(!webhook && req.headers.get("origin") && req.headers.get("origin")!==url.origin && req.headers.get("sec-fetch-site")!=="same-origin")return fail("Invalid request origin.",403);
 if(!req.headers.get("content-type")?.toLowerCase().includes("application/json"))return fail("Expected JSON.",415);
 let raw:string,data:any;
 try{raw=await rawBody(req);data=JSON.parse(raw);}catch{return fail("Invalid or oversized request.",400);}
 try{
 if(webhook){
   const mode=paymentMode(),provided=req.headers.get("x-razorpay-signature")||"";
   if(!mode||!cfg.RAZORPAY_WEBHOOK_SECRET||!secureEqual(await signature(cfg.RAZORPAY_WEBHOOK_SECRET,raw),provided))return fail("Invalid webhook signature.",401);
   if(data?.event!=="payment.captured")return reply({received:true});
   const p=data?.payload?.payment?.entity;
   if(p?.status!=="captured"||p?.currency!=="INR"||!/^pay_[A-Za-z0-9]{5,40}$/.test(p?.id||"")||typeof p?.order_id!=="string"||!Number.isInteger(p?.amount))return fail("Invalid payment.",400);
   const row=await db().prepare("SELECT * FROM applications WHERE order_id = ?").bind(p.order_id).first<Application>();
   if(row&&row.amount===p.amount)await markPaid(row,p.id);
   return reply({received:true});
 }
 if(path==="/api/admin/course"){
   if(!await authorizedAdmin(req))return fail("Admin access denied.",401);
   const error=await saveCourse(typeof data?.slug==="string"?data.slug:"",data);
   return error?fail(error==="schedule"?"Add a schedule and delivery mode before opening applications.":"Check the five day entries and batch fields.",400):reply({ok:true});
 }
 if(path==="/api/applications"){
   const r=await createApplication(data);
   if(!r.id)return fail(r.error==="duplicate"?"An application already exists for this email and batch.":r.error==="closed"?"Applications are not open for this batch.":"Enter a valid name, email and college, and agree to submit.",r.status);
   return reply({id:r.id,token:r.token,paymentMode:paymentMode()},201);
 }
 if(path==="/api/payments/order"||path==="/api/payments/verify"||path==="/api/applications/status"){
   const parsed=(path.endsWith("/verify")?verify:ref).safeParse(data);
   if(!parsed.success)return fail("Invalid application or payment details.",400);
   const row=await getApplication(parsed.data.id,parsed.data.token);
   if(!row)return fail("Application not found.",404);
   const mode=paymentMode();
   if(path==="/api/applications/status")return reply({id:row.id,paymentState:row.payment_state,paymentMode:mode,slug:row.slug});
   if(!mode)return fail("Online payment is not enabled.",503);
   if(row.payment_state==="paid"||row.payment_state==="test_paid")return reply({paymentState:row.payment_state});
   if(path.endsWith("/order")){
     const c=await lookup(row.slug);
     if(!c||c.status!=="open"||c.batch!==row.batch||row.review_state==="declined")return fail("This batch is not accepting payments.",409);
     const selection=checkout.safeParse(data);
     if(!selection.success || (selection.data.wallet && selection.data.referralCode))return fail("Choose one discount and check your referral code.",400);
     const {wallet,referralCode}=selection.data;
     const verifiedEmail=req.headers.get("oai-authenticated-user-id")?req.headers.get("oai-authenticated-user-email")?.toLowerCase()??null:null;
     if ((wallet||referralCode) && mode!=="live")return fail("Referral discounts require live payment mode.",409);
     if ((wallet||referralCode) && !row.order_id && row.amount===PAISE &&
         !await reserveDiscount(row,referralCode,wallet,verifiedEmail))return fail("That discount is unavailable. Wallet credit requires signing in with the application email.",409);
     const priced=await getApplication(parsed.data.id,parsed.data.token);
     if(!priced)return fail("Application not found.",404);
     let order=priced.order_id;
     if(!order){
       const created=await gateway("orders",{amount:priced.amount,currency:"INR",receipt:row.id,notes:{application_id:row.id}});
       await db().prepare("UPDATE applications SET order_id=? WHERE id=? AND order_id IS NULL AND amount=?").bind(created.id,row.id,priced.amount).run();
       order=await db().prepare("SELECT order_id FROM applications WHERE id=?").bind(row.id).first<string>("order_id");
       if(!order)throw new Error("Missing order");
     }
     const locked=await db().prepare("SELECT amount FROM applications WHERE id=? AND order_id=?").bind(row.id,order).first<number>("amount");
     if(!locked)throw new Error("Missing order price");
     return reply({orderId:order,key:cfg.RAZORPAY_KEY_ID,amount:locked,course:c.title,mode});
   }
   const p=verify.parse(data);
   if(!row.order_id||p.razorpay_order_id!==row.order_id||!cfg.RAZORPAY_KEY_SECRET||!secureEqual(await signature(cfg.RAZORPAY_KEY_SECRET,row.order_id+"|"+p.razorpay_payment_id),p.razorpay_signature))return fail("Payment signature could not be verified.",400);
   const payment=await gateway("payments/"+p.razorpay_payment_id);
   if(payment.order_id!==row.order_id||payment.amount!==row.amount||payment.currency!=="INR")return fail("Payment details do not match this application.",400);
   if(payment.status!=="captured")return reply({paymentState:"pending"},202);
   if(!await markPaid(row,p.razorpay_payment_id))return fail("Payment is being reconciled. Check status before trying again.",409);
   return reply({paymentState:mode==="test"?"test_paid":"paid"});
 }
 return fail("Not found.",404);
 }catch(e){console.error("Course request failed",path,e instanceof Error?e.name:"Unknown");return fail("Temporarily unavailable. Please try again shortly.",503);}
}
