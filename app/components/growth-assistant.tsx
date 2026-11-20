"use client";
import { useState } from "react";
import Link from "./link";
import { AIFeedback } from "./ai-feedback";
import { platformNames } from "../lib/provider-availability";
import { apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/session";
import "./growth-assistant.css";
import { track } from "../lib/track";
type Profile={description:string;audience:string;voice:string;goal:string};
type Metric={metric:string;current:number|null;previous:number|null;change_percent:number|null};
type Evidence={accounts?:{metrics:Record<string,number>;note:string}[];provider:string;top_posts:{id:string;caption:string;interactions:number;permalink?:string|null}[];comparisons:Metric[];reason?:string;note?:string;period?:{current_start:string;current_end:string;previous_start:string;previous_end:string}};
type Context={brand:{name:string};evidence:Evidence[];tracking?:{created_at:string;ready_after:string;status:string;content:string;suggestions:string[];results:{provider:string;metric:string;baseline:number|null;current:number|null;change_percent:number|null}[];note:string}};
type Result={generation_id?:number|null;content:string;suggestions:string[];simulated:boolean;context:Context};
const empty:Profile={description:"",audience:"",voice:"",goal:""};
const label=(text:string)=>text.replaceAll("_"," ");
const value=(n:number|null)=>n===null?"Unavailable":n.toLocaleString();
export function GrowthAssistant({unlocked}:{unlocked:boolean}) {
 const [profile,setProfile]=useState<Profile>(empty);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState("");
 const [platform,setPlatform]=useState("all");
 const [context,setContext]=useState<Context|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const auth=()=>({Authorization:`Bearer ${getAccessToken() ?? ""}`});
 async function loadProfile(){
  if(loaded || busy)return;
  setBusy("profile");setError("");
  try{setProfile(await apiRequest<Profile>("/ai/brand-profile",{headers:auth()}));setLoaded(true);}
  catch(e){setError(e instanceof Error?e.message:"Unable to load brand details.");}
  finally{setBusy("");}
 }
 async function save(){
  setBusy("save");setError("");setMessage("");
  try{setProfile(await apiRequest<Profile>("/ai/brand-profile",{method:"PUT",headers:auth(),body:JSON.stringify(profile)}));setMessage("Brand details saved. Your writing assistant will use them too.");}
  catch(e){setError(e instanceof Error?e.message:"Unable to save brand details.");}
  finally{setBusy("");}
 }
 async function review(generate:boolean){
  setBusy(generate?"generate":"review");setError("");setMessage("");
  try{
   if(generate){
    await apiRequest<Profile>("/ai/brand-profile",{method:"PUT",headers:auth(),body:JSON.stringify(profile)});
    const next=await apiRequest<Result>("/ai/assist",{method:"POST",headers:auth(),body:JSON.stringify({action:"strategy",platform})});
    setResult(next);setContext(next.context);track("growth_strategy_generated",{provider:platform});
   }else{setContext(await apiRequest<Context>(`/ai/growth-context?platform=${platform}`,{headers:auth()}));setResult(null);}
  }catch(e){setError(e instanceof Error?e.message:"Unable to review your growth plan.");}
  finally{setBusy("");}
 }
 return <details className="growth-assistant" onToggle={event=>{if(event.currentTarget.open && unlocked)void loadProfile();}}>
  <summary><span><small>PREMIUM AI</small><strong>Your next move, backed by your content.</strong></span><span>Growth assistant +</span></summary>
  {!unlocked?<div className="growth-assistant-body"><p>Get a brand-aware content plan, explanations behind each recommendation and a way to compare measured results.</p><Link href="/billing">Explore Premium AI</Link></div>:<div className="growth-assistant-body">
   <p>Teach the assistant who you serve. It supports every Social9 platform, using available insights and your brand details to suggest experiments. Performance tracking uses comparable daily metrics where available. Connect Threads in Accounts before publishing Threads ideas.</p>
   <fieldset disabled={!!busy || !loaded}><legend>Your brand context</legend><div className="growth-profile-grid">{([{key:"description",title:"What does your business offer?",max:800},{key:"audience",title:"Who do you want to reach?",max:500},{key:"voice",title:"How should your brand sound?",max:200},{key:"goal",title:"What is your current goal?",max:300}] as const).map(field=><label key={field.key} htmlFor={`growth-${field.key}`}>{field.title}<textarea id={`growth-${field.key}`} maxLength={field.max} value={profile[field.key]} onChange={event=>setProfile({...profile,[field.key]:event.target.value})} rows={2}/></label>)}</div><button type="button" onClick={()=>void save()}>Save brand details</button></fieldset>
   {!loaded && !busy?<button type="button" onClick={()=>void loadProfile()}>Retry loading brand details</button>:null}
   <div className="growth-controls"><label htmlFor="growth-platform">Channel<select id="growth-platform" value={platform} disabled={!!busy} onChange={event=>{setPlatform(event.target.value);setContext(null);setResult(null);}}><option value="all">All platforms</option>{Object.entries(platformNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><button type="button" disabled={!!busy || !loaded} onClick={()=>void review(false)}>Review evidence &amp; progress</button><button type="button" disabled={!!busy || !loaded} onClick={()=>void review(true)}>Generate &amp; save a new 7-day plan</button></div>
   {busy?<p role="status">{busy==="generate"?"Reviewing your brand and available performance...":"Loading..."}</p>:null}{error?<p role="alert" className="error-message">{error}</p>:null}{message?<p role="status">{message}</p>:null}
   {result?<article className="growth-plan"><small>{result.simulated?"ILLUSTRATIVE PREVIEW / NOT SAVED":"AI PLAN / SAVED WITH BASELINE"}</small><h3>Try this over the next seven days.</h3><p>{result.content}</p><ul>{result.suggestions.map((s,index)=><li key={index}>{s}</li>)}</ul><Link href="/create-post">Create your next post</Link><AIFeedback generationId={result.generation_id}/></article>:null}
   {context?.tracking?<article className="growth-tracking"><h3>Your saved plan &amp; progress</h3><p>Plan started {new Date(context.tracking.created_at).toLocaleDateString()}. {context.tracking.status==="collecting"?`Collecting seven complete days of results. Review from ${context.tracking.ready_after}.`:context.tracking.status==="unavailable"?"There is not enough reported data to measure progress yet. Check your connected-account insights.":"Compare the last seven complete days with the baseline saved before your plan."}</p>{!result?<details><summary>Read the saved plan</summary><p className="growth-saved-copy">{context.tracking.content}</p><ul>{context.tracking.suggestions.map((s,index)=><li key={index}>{s}</li>)}</ul></details>:null}{context.tracking.results.length?<div className="growth-table"><table><caption>Observed results since your plan</caption><thead><tr><th>Channel / metric</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead><tbody>{context.tracking.results.map(row=><tr key={`${row.provider}-${row.metric}`}><th>{label(row.provider)} / {label(row.metric)}</th><td>{value(row.baseline)}</td><td>{value(row.current)}</td><td>{row.change_percent===null?"Unavailable":`${row.change_percent}%`}</td></tr>)}</tbody></table></div>:null}<small>{context.tracking.note}</small></article>:null}
   {context?<div className="growth-evidence"><h3>The evidence behind the advice</h3>{context.evidence.map(source=><article key={source.provider}><h4>{platformNames[source.provider] ?? label(source.provider)}</h4>{source.reason?<p>{source.reason}</p>:null}{source.period?<p>{source.period.current_start} to {source.period.current_end}, compared with {source.period.previous_start} to {source.period.previous_end}.</p>:null}{source.comparisons.length?<div className="growth-table"><table><caption>Last seven complete days vs previous seven</caption><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>{source.comparisons.map(row=><tr key={row.metric}><th>{label(row.metric)}</th><td>{value(row.current)}</td><td>{value(row.previous)}</td><td>{row.change_percent===null?"Unavailable":`${row.change_percent}%`}</td></tr>)}</tbody></table></div>:null}{source.accounts?.map((account,index)=><div key={index}><h5>Account {index+1}: reported metrics</h5><dl>{Object.entries(account.metrics).map(([metric,n])=><div key={metric}><dt>{label(metric)}</dt><dd>{value(n)}</dd></div>)}</dl><p>{account.note}</p></div>)}{source.top_posts.length?<details><summary>Top observed posts ({source.top_posts.length})</summary><ol>{source.top_posts.map(post=><li key={post.id}><p>{post.caption || "Media post without a caption"}</p><small>{post.interactions.toLocaleString()} reported interactions</small>{post.permalink?<a href={post.permalink} target="_blank" rel="noopener noreferrer">View original post</a>:null}</li>)}</ol></details>:<p>No ranked posts available. Content ideas will be hypotheses until performance data is available.</p>}{source.note?<small>{source.note}</small>:null}</article>)}</div>:null}
  </div>}
 </details>;
}
