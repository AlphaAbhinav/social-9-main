import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Reset Your Password", "Request a password reset for your Social9 account.", "/forgot-password", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
