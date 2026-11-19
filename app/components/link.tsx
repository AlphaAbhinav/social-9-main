import type { AnchorHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/**
 * Use native navigation for production reliability across the vinext runtime.
 * The app does not need client-side route prefetching, and full navigations
 * preserve the same URLs while avoiding the adapter's prefetch failure.
 */
export default function Link({ href, children, ...props }: LinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
