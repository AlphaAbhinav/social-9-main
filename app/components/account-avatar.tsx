"use client";
import { useState } from "react";
import Image from "next/image";
import { SocialIcon } from "./social-icon";
export function AccountAvatar({provider,name,url}:{provider:"instagram"|"facebook"|"linkedin"|"threads"|"youtube"|"twitter"|"pinterest";name:string;url?:string|null}) {
  const [failed,setFailed]=useState<string|null>(null);
  return <span className="connected-account-avatar">{url && failed !== url ? <Image src={url} alt={`${name} profile picture`} width={40} height={40} unoptimized referrerPolicy="no-referrer" onError={()=>setFailed(url)} /> : <SocialIcon provider={provider} label={`${name} (${provider})`} />}</span>;
}
