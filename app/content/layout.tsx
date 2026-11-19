import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Social Media Content Library", "Find, edit, and reuse your drafts, scheduled posts, and published content.", "/content", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
