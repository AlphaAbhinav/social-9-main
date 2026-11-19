import Link from "../components/link";
import { pageMetadata } from "../lib/seo";
import { ProductTour } from "./product-tour";
import "./product-tour.css";

export const metadata = pageMetadata(
  "Social9 Product Walkthrough",
  "Explore real Social9 screens: open a calendar idea, prepare your caption and media, and manage your content library.",
  "/product-tour",
  true,
);

export default function ProductTourPage() {
  return <main className="product-tour-page">
    <Link href="/">Social9 home</Link>
    <header>
      <span className="eyebrow">Inside the product</span>
      <h1>From your first idea to your next post.</h1>
      <p>Explore the actual calendar, composer and content library before creating your account.</p>
    </header>
    <p className="tour-disclosure">These screens were captured from the real Social9 interface in a demo workspace. Captions and account data are examples, not customer results.</p>
    <ProductTour />
    <section className="tour-publishing-note">
      <h2>See an actual scheduled Instagram post.</h2>
      <p>A clearly labeled Social9 test was scheduled and automatically published to @vcuestore on 19 October 2026. It uses a demonstration image and caption; this is a publishing example, not a customer performance claim.</p>
      <a href="https://www.instagram.com/p/DeraR1cm-n4/" target="_blank" rel="noopener noreferrer">View the Instagram test post</a>
    </section>
    <section className="tour-publishing-note">
      <h2>Ready to publish?</h2>
      <p>Connect a supported account and grant its publishing permissions. Instagram requires a professional account and suitable media; Facebook publishing requires Page access. Review the destination and preview before scheduling, then check the delivery status. A saved draft or scheduled post is not yet a confirmed publication.</p>
      <Link href="/signup">Start with a free 30-day content plan</Link>
    </section>
  </main>;
}
