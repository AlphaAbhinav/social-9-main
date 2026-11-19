import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Privacy Policy", "Learn how Social9 collects, uses, stores, and protects account and connected social platform information.", "/privacy", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
