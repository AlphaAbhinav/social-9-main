import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Verify Your Email", "Verify your email address to activate your Social9 account.", "/verify-email", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
