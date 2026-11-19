import { androidAppUrl } from "../lib/mobile-app";
import { Social9Mark } from "./social9-mark";
import "./app-download.css";

function AndroidIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m7.2 5.2-1.3-2.3.9-.5 1.4 2.3a9.8 9.8 0 0 1 7.6 0l1.4-2.3.9.5-1.3 2.3A8.1 8.1 0 0 1 21 12H3a8.1 8.1 0 0 1 4.2-6.8ZM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM3 13h18v5a2 2 0 0 1-2 2h-1v2h-3v-2H9v2H6v-2H5a2 2 0 0 1-2-2v-5Z" /></svg>;
}

export function AndroidDownloadBadge() {
  const url = androidAppUrl();
  const content = <><AndroidIcon /><span><small>{url ? "GET IT ON" : "COMING SOON TO"}</small><strong>Google Play</strong></span></>;
  return url
    ? <a className="s9-android-badge" href={url} target="_blank" rel="noopener noreferrer" aria-label="Download Social9 for Android on Google Play (opens in a new tab)">{content}</a>
    : <span className="s9-android-badge is-coming-soon" aria-label="Social9 for Android is coming soon to Google Play">{content}</span>;
}

export function AppDownloadPrompt({ className = "" }: { className?: string }) {
  const live = Boolean(androidAppUrl());
  return <a className={`s9-app-prompt ${className}`} href="#download-app"><AndroidIcon /><span>{live ? "Download Android app" : "Android app"}</span>{!live && <small>Coming soon</small>}<span aria-hidden="true">↗</span></a>;
}

export function AppDownloadSection() {
  const live = Boolean(androidAppUrl());
  return <section className="s9-app-section" id="download-app" aria-labelledby="app-download-heading">
    <div className="s9-app-copy">
      <div className="neon-section-label"><i /> Social9 for Android</div>
      <h2 id="app-download-heading">Your social world.<br /><em>Ready to go with you.</em></h2>
      <p>{live ? "Take Social9 with you. Download our Android app from Google Play and keep your social content close." : "Social9 is coming to Android. A new way to keep your social content close, wherever the day takes you."}</p>
      <AndroidDownloadBadge />
      <p className="s9-app-availability">{live ? "Available for Android on Google Play." : "The Android app is not live yet. The download link will be available here when it launches."}</p>
    </div>
    <div className="s9-app-art" aria-hidden="true">
      <span className="s9-app-orbit" />
      <div className="s9-app-phone"><span className="s9-app-camera" /><Social9Mark /><strong>SOCIAL9</strong><span>Your next chapter.<br />On Android.</span><span className="s9-app-status">{live ? "Available now" : "Coming soon"}</span><AndroidIcon /></div>
      <span className="s9-app-art-caption">YOUR CONTENT. WITH YOU.</span>
    </div>
  </section>;
}
