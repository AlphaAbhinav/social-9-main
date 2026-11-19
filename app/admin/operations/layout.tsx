import { pageMetadata } from "../../lib/seo";

export const metadata = {
  ...pageMetadata("Admin Operations", "Social9 administrator support and operational controls.", "/admin/operations", false),
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
