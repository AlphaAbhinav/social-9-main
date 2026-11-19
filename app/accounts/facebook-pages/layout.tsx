import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata("Choose Facebook Pages", "Choose which authorized Facebook Pages to connect to your Social9 workspace.", "/accounts/facebook-pages", false);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
