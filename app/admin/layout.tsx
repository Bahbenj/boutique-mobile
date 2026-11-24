import type { Metadata } from "next";

/** Toute l'administration : jamais indexée (en plus de l'en-tête X-Robots-Tag du proxy). */
export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-svh flex-1 flex-col bg-cream">{children}</div>;
}
