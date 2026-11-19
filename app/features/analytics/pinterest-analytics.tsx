"use client";

import { useState } from "react";
import { AnalyticsBarChart } from "../../components/analytics-bar-chart";
import { Dropdown } from "../../components/dropdown";
import Link from "../../components/link";
import { SocialIcon } from "../../components/social-icon";
import "./pinterest-analytics.css";

type Metric = "IMPRESSION" | "SAVE" | "PIN_CLICK" | "OUTBOUND_CLICK";
const labels: Record<Metric, string> = {
  IMPRESSION: "Impressions", SAVE: "Saves", PIN_CLICK: "Pin clicks", OUTBOUND_CLICK: "Outbound clicks",
};
const metrics = Object.keys(labels) as Metric[];
const number = (value: number | null | undefined) => value != null && Number.isFinite(value) ? value.toLocaleString() : "—";

export type PinterestPin = {
  id: string; title: string; created_at: string | null; thumbnail_url: string | null;
  impressions: number | null; saves: number | null; pin_clicks: number | null;
  outbound_clicks: number | null; url: string;
};
export type PinterestAccount = {
  account_id: number; account_name: string; available: boolean;
  metrics: Record<string, number> | null;
  daily?: Array<{ date: string; metrics?: Record<string, number> }> | null;
  pins?: PinterestPin[] | null; pins_note?: string; note: string;
};

export function PinterestAnalytics({ accounts, days }: { accounts: PinterestAccount[]; days: number }) {
  const [accountId, setAccountId] = useState(String(accounts[0]?.account_id ?? ""));
  const [metric, setMetric] = useState<Metric>("IMPRESSION");
  const account = accounts.find(item => String(item.account_id) === accountId) ?? accounts[0];
  if (!account) return null;
  const summary = account.metrics ?? {};
  const daily = account.daily ?? [];
  const pins = account.pins ?? [];
  const byDay = new Map(daily.filter(row => typeof row.date === "string").map(row => [row.date, row.metrics ?? {}]));
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const points = daily.length ? Array.from({ length: days }, (_, index) => {
    const date = new Date(yesterday);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const day = date.toISOString().slice(0, 10);
    const value = byDay.get(day)?.[metric];
    return { date: day, value: typeof value === "number" && Number.isFinite(value) ? value : null };
  }) : [];

  return <section className="pinterest-analytics-section" aria-label="Pinterest account analytics">
    <div className="analytics-card-heading">
      <div><span className="eyebrow">Pinterest accounts</span><h2>Measure your Pin performance.</h2></div>
      {accounts.length > 1 && <label htmlFor="dropdown-pinterest-account" className="content-type-filter">Account
        <Dropdown id="dropdown-pinterest-account" label="Pinterest account" value={String(account.account_id)} onValueChange={setAccountId}>
          {accounts.map(item => <option key={item.account_id} value={String(item.account_id)}>{item.account_name}</option>)}
        </Dropdown>
      </label>}
    </div>
    <p className="growth-planner-note">{account.account_name} · Last {days} completed days, ending yesterday (UTC). Organic analytics may be delayed.</p>
    {!account.available ? <div className="analytics-empty"><SocialIcon provider="pinterest" /><strong>Pinterest insights are unavailable.</strong><p>{account.note}</p><Link href="/accounts">Review account connection →</Link></div> : <>
      <section className="instagram-scorecard" aria-label="Pinterest performance overview">
        {metrics.map(key => <article key={key} data-analytics-card><span>{labels[key]}</span><strong>{number(summary[key])}</strong><small>Organic activity in this period</small></article>)}
      </section>
      <p className="growth-planner-note">{account.note} A dash means Pinterest did not return that value.</p>
      <section className="provider-insights-card" data-analytics-card>
        <div className="analytics-card-heading"><div><span className="eyebrow">Pinterest trends</span><h3>Performance over time</h3></div>
          <div className="insight-metric-tabs" role="group" aria-label="Select Pinterest chart metric">
            {metrics.map(key => <button type="button" key={key} className={metric === key ? "active" : ""} aria-pressed={metric === key} onClick={() => setMetric(key)}>{labels[key]}</button>)}
          </div>
        </div>
        <div className="insight-chart-summary"><div><strong>{number(summary[metric])}</strong><span>{labels[metric]}</span></div><small>Gaps indicate days Pinterest did not return</small></div>
        <AnalyticsBarChart points={points} label={labels[metric]} tone="red" />
      </section>
      <section className="pinterest-content-section" data-analytics-card>
        <div className="analytics-card-heading"><div><span className="eyebrow">Pinterest content</span><h3>Recent Pins</h3></div></div>
        <p className="growth-planner-note">Up to 20 owned Pins. Pin metrics are lifetime counts when Pinterest provides them; they do not follow the selected date range.</p>
        {account.pins === null ? <p className="network-analytics-empty">{account.pins_note ?? "Recent Pins are unavailable."}</p>
          : pins.length ? <div className="pinterest-pin-list">{pins.map(pin => <article className="pinterest-pin" key={pin.id}>
            {pin.thumbnail_url ? <div className="pinterest-pin-thumbnail" role="img" aria-label={`Thumbnail for ${pin.title}`} style={{ backgroundImage: `url("${pin.thumbnail_url}")` }} /> : <div className="pinterest-pin-thumbnail" aria-hidden="true"><SocialIcon provider="pinterest" /></div>}
            <div className="pinterest-pin-copy"><strong><a href={pin.url} target="_blank" rel="noreferrer">{pin.title}</a></strong><small>{pin.created_at && !Number.isNaN(Date.parse(pin.created_at)) ? new Date(pin.created_at).toLocaleDateString() : "Date unavailable"}</small></div>
            <dl><div><dt>Impressions</dt><dd>{number(pin.impressions)}</dd></div><div><dt>Saves</dt><dd>{number(pin.saves)}</dd></div><div><dt>Pin clicks</dt><dd>{number(pin.pin_clicks)}</dd></div><div><dt>Outbound clicks</dt><dd>{number(pin.outbound_clicks)}</dd></div></dl>
            <a className="pinterest-pin-open" href={pin.url} target="_blank" rel="noreferrer" aria-label={`Open ${pin.title} on Pinterest`}>↗</a>
          </article>)}</div>
          : <p className="network-analytics-empty">No owned Pins found for this account.</p>}
      </section>
    </>}
  </section>;
}
