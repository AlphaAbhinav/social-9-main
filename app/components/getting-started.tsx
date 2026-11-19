import Link from "./link";
import type { AnalyticsSummary } from "../lib/analytics";
import "./getting-started.css";

export function GettingStarted({ overview }: { overview: AnalyticsSummary["overview"] }) {
  if (overview.provider_published > 0) return null;
  const steps = [
    { done: overview.connected_accounts > 0, title: "Connect a channel", detail: "Add Instagram, Facebook Pages, or LinkedIn to your workspace.", href: "/accounts", action: "Connect accounts" },
    { done: overview.total_posts > 0, title: "Create your first post", detail: "Start with a draft. You can review it before publishing.", href: "/create-post", action: "Create a draft" },
    { done: false, title: "Publish and check delivery", detail: overview.failed > 0 ? "A post needs attention. Check its error and retry the remaining channels." : overview.preview_published > 0 ? "Your preview worked. Connect a live account to publish publicly." : overview.scheduled > 0 ? "Your post is scheduled. Check the library after its delivery time." : "Publish when ready, or schedule a time that works for you.", href: overview.preview_published > 0 && !overview.failed ? "/accounts" : "/content", action: overview.preview_published > 0 && !overview.failed ? "Review live access" : "Review your posts" },
  ];
  const current = steps.findIndex((step) => !step.done);
  return <section className="getting-started" aria-labelledby="getting-started-title">
    <header><div><span className="eyebrow">Your first successful post</span><h2 id="getting-started-title">Let’s get your workspace moving.</h2></div><span>{steps.filter((step) => step.done).length} of 3 steps complete</span></header>
    <ol>{steps.map((step, index) => <li key={step.title} aria-current={index === current ? "step" : undefined}>
      <span className="getting-started-number" aria-label={step.done ? "Complete" : `Step ${index + 1}`}>{step.done ? "✓" : index + 1}</span>
      <div><h3>{step.title}</h3><p>{step.detail}</p><Link href={step.href}>{step.done ? "Review" : step.action}<span aria-hidden="true"> →</span></Link></div>
    </li>)}</ol>
    <p className="getting-started-note">Preview connections simulate delivery. A live post is confirmed only after the provider returns a delivery result.</p>
  </section>;
}
