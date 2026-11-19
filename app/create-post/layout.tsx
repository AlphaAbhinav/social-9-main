import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("Create a Social Media Post", "Write captions, add media, and publish or schedule Instagram, Facebook Pages, and LinkedIn posts.", "/create-post", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
