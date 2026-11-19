import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Connected Social Accounts", "Connect and manage Instagram, Facebook Pages, and LinkedIn accounts for publishing and analytics.", "/accounts", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
