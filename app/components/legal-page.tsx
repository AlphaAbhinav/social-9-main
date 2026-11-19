import type { ReactNode } from "react";
import Link from "./link";

import { Social9Mark } from "./social9-mark";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <main className="legal-page"><header><Link className="landing-logo" href="/"><Social9Mark /><span>Social9</span></Link><nav><Link href="/">Home</Link><Link href="/login">Sign in</Link></nav></header><section className="legal-hero"><span className="landing-kicker"><i />{eyebrow}</span><h1>{title}</h1><p>{intro}</p><small>Effective date: 6 November 2026</small></section><article className="legal-content">{children}</article><footer><span>© 2026 Social9</span><div><Link href="/privacy">Privacy policy</Link><Link href="/data-deletion">Data deletion</Link><Link href="/terms">Terms of service</Link><Link href="/refunds">Refund policy</Link></div></footer></main>;
}
