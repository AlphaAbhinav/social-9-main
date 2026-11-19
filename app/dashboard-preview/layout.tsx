import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Dashboard Preview", "Explore a sample Social9 publishing dashboard with illustrative data.", "/dashboard-preview", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
