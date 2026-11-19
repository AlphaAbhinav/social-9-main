import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Choose a New Password", "Set a new password to regain access to your Social9 account.", "/reset-password", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
