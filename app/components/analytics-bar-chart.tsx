"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { chartScale } from "../lib/chart-scale";
import "./analytics-bar-chart.css";

type Point = { date: string; value: number | null };
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
function dateLabel(date: string, full = false) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, full ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

export function AnalyticsBarChart({ points, label, tone = "violet" }: { points: Point[]; label: string; tone?: "violet" | "blue" | "red" }) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const scale = chartScale(points.map(point => point.value));
  const activeIndex = Math.max(0, activeDate ? points.findIndex(point => point.date === activeDate) : points.length - 1);
  const active = points[activeIndex];
  const tickIndices = [...new Set([0, ...points.map((_, index) => index).filter(index => index % Math.max(1, Math.ceil((points.length - 1) / 5)) === 0), points.length - 1])];

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? Math.min(points.length - 1, index + 1) : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActiveDate(points[next].date);
    buttons.current[next]?.focus({ preventScroll: true });
    buttons.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  if (!points.length) return <p className="analytics-chart-empty">No daily values are available for this period.</p>;

  return <div className={`analytics-chart analytics-chart-${tone}`} role="group" aria-label={`${label} by day`}>
    <div className="analytics-chart-detail" aria-live="polite" aria-atomic="true">
      <span className="analytics-chart-legend"><i aria-hidden="true" />{label}</span>
      <span><time dateTime={active.date}>{dateLabel(active.date, true)}</time><strong>{active.value === null ? "Unavailable" : number.format(active.value)}</strong></span>
    </div>
    <div className="analytics-chart-body">
      <div className="analytics-chart-axis" aria-hidden="true">{scale.ticks.map(tick => <span key={tick} style={{ top: `${scale.position(tick)}%` }}>{compact.format(tick)}</span>)}</div>
      <div className="analytics-chart-scroll" tabIndex={points.length > 35 ? 0 : undefined} aria-label={points.length > 35 ? "Scroll to explore all dates" : undefined}>
        <div className="analytics-chart-canvas" style={{ minWidth: Math.max(0, points.length * 12) }}>
          <div className="analytics-chart-plot">
            <div className="analytics-chart-grid" aria-hidden="true">{scale.ticks.map(tick => <span key={tick} className={tick === 0 ? "is-zero" : undefined} style={{ top: `${scale.position(tick)}%` }} />)}</div>
            <div className="analytics-chart-columns" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
              {points.map((point, index) => {
                const valid = point.value !== null && Number.isFinite(point.value);
                const y = valid ? scale.position(point.value as number) : scale.zero;
                return <button key={point.date} ref={element => { buttons.current[index] = element; }} type="button" className={index === activeIndex ? "analytics-chart-column is-active" : "analytics-chart-column"} tabIndex={index === activeIndex ? 0 : -1} aria-label={`${dateLabel(point.date, true)}: ${valid ? `${number.format(point.value as number)} ${label}` : "unavailable"}`} onPointerEnter={() => setActiveDate(point.date)} onFocus={() => setActiveDate(point.date)} onClick={() => setActiveDate(point.date)} onKeyDown={event => navigate(event, index)}>
                  {valid ? <span className="analytics-chart-bar" style={{ top: `${Math.min(y, scale.zero)}%`, height: `${Math.abs(y - scale.zero)}%` }} /> : <span className="analytics-chart-gap" style={{ top: `${scale.zero}%` }} />}
                </button>;
              })}
            </div>
          </div>
          <div className="analytics-chart-dates" aria-hidden="true">{tickIndices.map((index, tick) => <span key={points[index].date} className={tick === 0 ? "is-first" : tick === tickIndices.length - 1 ? "is-last" : undefined} style={{ left: `${(index + .5) / points.length * 100}%` }}>{dateLabel(points[index].date)}</span>)}</div>
        </div>
      </div>
    </div>
    <p className="analytics-chart-hint">Daily values<span>Hover a bar, tap, or use the arrow keys to explore.</span></p>
  </div>;
}
