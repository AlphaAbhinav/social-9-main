"use client";
import {useEffect,useRef} from "react";
import {SchedulePicker} from "./schedule-picker";

export function ScheduleDialog({value,onChange,onClose,onSchedule,busy,error}: {value:string;onChange:(value:string)=>void;onClose:()=>void;onSchedule:()=>void;busy:boolean;error:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;const previous=document.body.style.overflow;document.body.style.overflow="hidden";dialog?.showModal();return()=>{dialog?.close();document.body.style.overflow=previous;};},[]);
  const valid=!!value && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime()>new Date().getTime();
  return <dialog ref={ref} className="composer-schedule-dialog composer-content" aria-label="Schedule post" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <button type="button" className="schedule-dialog-close" aria-label="Close scheduling" disabled={busy} onClick={onClose}>×</button>
    <div className="schedule-dialog-body"><SchedulePicker value={value} onChange={onChange} initialOpen />
    {error && <p className="schedule-dialog-error" role="alert">{error}</p>}
    </div><div className="schedule-dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="primary-composer-button" disabled={busy || !valid} onClick={onSchedule}>{busy?"Scheduling…":"Confirm schedule"}</button></div>
  </dialog>;
}
