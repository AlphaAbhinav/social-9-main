import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Publishing Dashboard", "Review your connected accounts, scheduled posts, and publishing activity.", "/dashboard", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
