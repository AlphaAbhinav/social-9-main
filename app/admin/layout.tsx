import { pageMetadata } from "../lib/seo";

export const metadata = {
  ...pageMetadata("Admin Portal", "Social9 platform administration.", "/admin", false),
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
