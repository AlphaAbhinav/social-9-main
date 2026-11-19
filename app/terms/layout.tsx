import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Terms of Service", "Read the terms for using Social9 content planning, publishing, and connected social account services.", "/terms", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
