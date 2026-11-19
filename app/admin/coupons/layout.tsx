import { pageMetadata } from "../../lib/seo";

export const metadata = {
  ...pageMetadata("Admin Coupons", "Manage Social9 checkout coupons and redemption history.", "/admin/coupons", false),
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
