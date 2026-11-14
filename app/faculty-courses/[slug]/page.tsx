import {notFound} from "next/navigation";
import {Frame} from "@/app/ui";
import {facultyTemplates} from "@/lib/faculty-templates";

export default async function FacultyCourse({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const course=facultyTemplates.find(item=>item.slug===slug);
 if(!course)notFound();

 return <Frame><section className="wrap narrow prose">
  <a className="back" href={course.subject==="Data Analytics"?"/#data-analytics":"/#dbms"}>Back to the course catalogue</a>
  <h1>{course.subject} by {course.instructor}</h1>
  <dl className="receipt-details">
   <dt>Instructor</dt><dd>{course.instructor}</dd>
   <dt>Duration</dt><dd>5 days · 3 hours per day · 15 hours total</dd>
  </dl>
  <h2>Session plan</h2>
  <p>The instructor will decide the topics and activities for all five sessions.</p>
  <ol className="days">{Array.from({length:5},(_,index)=>
   <li key={index}><span className="day-no">Day {index+1}</span><span>3 hours</span></li>
  )}</ol>
 </section></Frame>;
}
