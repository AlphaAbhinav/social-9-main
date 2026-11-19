import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Sign In", "Sign in to manage your Social9 content calendar, connected accounts, and scheduled posts.", "/login", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
