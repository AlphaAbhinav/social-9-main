"use client";

import {useState} from "react";

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

export function SchedulePicker({value,onChange,initialOpen=false}: {value:string;onChange:(value:string)=>void;initialOpen?:boolean}) {
  const [open,setOpen] = useState(initialOpen);
  const [month,setMonth] = useState(() => {const selected=value?new Date(value):new Date();return new Date(selected.getFullYear(),selected.getMonth(),1);});
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
  const date = value.split("T")[0] || "";
  const time = value.split("T")[1] || "09:00";
  const [hour,minute] = time.split(":");
  const selected = date ? new Date(`${date}T12:00`) : null;
  const firstDay = new Date(month.getFullYear(),month.getMonth(),1).getDay();
  const count = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  function choose(day: Date) {onChange(`${localDate(day)}T${time}`);setOpen(false);setMonth(new Date(day.getFullYear(),day.getMonth(),1));}
  function quick(days:number) {choose(new Date(today.getFullYear(),today.getMonth(),today.getDate()+days));}
  return <section className="composer-schedule" aria-label="Schedule your post">
    <div className="composer-panel-heading"><div><span className="eyebrow">When to publish</span><h2>Schedule</h2></div><span aria-hidden="true">◷</span></div>
    <div className="schedule-quick"><button type="button" onClick={()=>quick(1)}>Tomorrow</button><button type="button" onClick={()=>quick(7)}>Next week</button>{value && <button type="button" onClick={()=>onChange("")}>Clear</button>}</div>
    <button className="schedule-date-trigger" type="button" aria-expanded={open} aria-controls="composer-date-calendar" onClick={()=>{if(!open && selected) setMonth(new Date(selected.getFullYear(),selected.getMonth(),1));setOpen(!open);}}><span aria-hidden="true">▦</span><span><small>Publish date</small><strong>{selected ? selected.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"long",year:"numeric"}) : "Choose a date"}</strong></span><span aria-hidden="true">⌄</span></button>
    {open && <div id="composer-date-calendar" className="schedule-calendar"><div className="schedule-month"><button type="button" aria-label="Previous month" disabled={month <= new Date(today.getFullYear(),today.getMonth(),1)} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><strong>{month.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</strong><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div><div className="schedule-days">{["Su","Mo","Tu","We","Th","Fr","Sa"].map(day=><span key={day}>{day}</span>)}{Array.from({length:firstDay},(_,i)=><span key={`empty-${i}`} />)}{Array.from({length:count},(_,i)=>{const day=new Date(month.getFullYear(),month.getMonth(),i+1);const key=localDate(day);return <button key={key} type="button" disabled={key < localDate(today)} aria-label={day.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} aria-pressed={key===date} className={key===localDate(today)?"is-today":""} onClick={()=>choose(day)}>{i+1}</button>;})}</div></div>}
    <div className="schedule-time"><span>Publish time</span><div><select aria-label="Publish hour" value={hour} onChange={event=>onChange(`${date || localDate(tomorrow)}T${event.target.value}:${minute}`)}>{Array.from({length:24},(_,i)=>{const h=String(i).padStart(2,"0");return <option key={h} value={h}>{h}</option>;})}</select><span>:</span><select aria-label="Publish minute" value={minute} onChange={event=>onChange(`${date || localDate(tomorrow)}T${hour}:${event.target.value}`)}>{Array.from({length:60},(_,i)=>{const m=String(i).padStart(2,"0");return <option key={m} value={m}>{m}</option>;})}</select></div></div>
    <p className="schedule-timezone">Times use your device’s local timezone. Review the date and time before scheduling.</p>
    {value && new Date(value).getTime() <= today.getTime() && <p role="alert" className="schedule-invalid">Choose a future date and time.</p>}
  </section>;
}
