import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Publishing Action Center", "Review failed posts, account connection issues, and publishing tasks.", "/actions", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
