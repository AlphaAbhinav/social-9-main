import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata(
  "Agency Workspace",
  "Collaborate on content approvals, export publishing reports and compare public competitor profiles.",
  "/agency",
  false,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
