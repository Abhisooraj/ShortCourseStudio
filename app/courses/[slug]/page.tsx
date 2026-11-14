import {notFound} from "next/navigation";
import {ArrowLeft,ArrowRight,ArrowDownToLine} from "lucide-react";
import {Badge,Facts,Frame} from "@/app/ui";
import {getCourse,feeText,TRACKS} from "@/lib/courses";
import {lookup,paymentMode} from "@/lib/enrollment";
import {courseBrief,pythonDetails} from "@/lib/programme";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const course=getCourse((await params).slug);return {title:course?.title??"Course not found"}}
export default async function CoursePage({params}:{params:Promise<{slug:string}>}){
 const c=await lookup((await params).slug);if(!c)notFound();
 const brief=courseBrief(c),python=c.slug==="python-for-data-analytics";
 const defaults=getCourse(c.slug)!;
 const anchor=["data-analytics","dbms","networks","coa","toc"][TRACKS.indexOf(c.track)];
 return <Frame><section className="detail-hero"><div className="wrap"><a className="back" href={"/#"+anchor}><ArrowLeft size={16}/> {c.track}</a><div className="detail-grid"><div><span className="eyebrow">SHORT-TERM TRAINING</span><h1>{c.title}</h1><p>{c.blurb}</p><Facts/>{python&&<a className="textlink" href="/brochure.pdf" target="_blank" rel="noopener">Download the detailed brochure <ArrowDownToLine size={17}/></a>}</div><aside className="enroll"><Badge status={c.status}/><h2>Registration details</h2><dl><dt>Course fee</dt><dd>{feeText} per participant</dd><dt>Batch schedule</dt><dd>{c.schedule||"To be announced"}</dd><dt>Mode / venue</dt><dd>{c.mode||"To be announced"}</dd></dl>{c.status!=="closed"?<><a className="btn primary" href={"/apply?course="+c.slug}>{c.status==="open"?"Start application":"Pre-apply for this course"} <ArrowRight size={17}/></a>{c.status==="soon"&&<p className="enroll-note">No payment is due now. A pre-application does not reserve a seat.</p>}</>:<div className="mutedbox">This batch is no longer accepting applications.</div>}{c.status==="open"&&paymentMode()==="live"&&<small className="paymethods">Online payment options may include UPI, cards and net banking.</small>}</aside></div></div></section>
 <section className="wrap syllabus"><div><span className="eyebrow">DAY-WISE COURSE CONTENT</span><h2>Five-day teaching plan</h2><p className="plan-time">Each day includes a 45-minute lecture, 90-minute lab, 30-minute review and 15-minute break.</p>
 <ol className="days">{c.days.map(([title,practical],i)=>{const original=python&&title===defaults.days[i][0]&&practical===defaults.days[i][1];return <li key={i}><span className="day-no">DAY {String(i+1).padStart(2,"0")}</span><div><h3>{title}</h3>{original&&<p><strong>Lecture topics</strong> {pythonDetails.lecture[i]}</p>}<p><strong>Guided practical</strong> {original?pythonDetails.practical[i]:practical}</p>{original&&<p><strong>Lab output</strong> {pythonDetails.evidence[i]}</p>}</div></li>})}</ol></div>
 <div className="course-sidebar"><aside className="outcome"><h3>Learning objectives</h3><ul>{brief.objectives.map(item=><li key={item}>{item}</li>)}</ul><h3>Final project</h3><p>{c.outcome}</p></aside><aside className="outcome"><h3>Who should attend</h3><p>{brief.audience}</p><h3>Prerequisites</h3><p>{brief.prerequisite}</p><h3>Tools &amp; resources</h3><p>{c.tools}.</p><p>{brief.resources}</p></aside>
 <section className="outcome" aria-labelledby="course-referral-heading">
  <h3 id="course-referral-heading">Refer a friend</h3>
  <p>Know someone who would benefit from this course? Share this page’s link so they can see what they’ll learn, check the batch schedule, and find out how to apply.</p>
 </section></div></section>
 </Frame>;
}
