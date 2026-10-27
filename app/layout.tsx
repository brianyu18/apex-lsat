import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SideNav, BottomNav } from "@/components/shell/nav";

export const metadata: Metadata = {
  title: { default: "Apex LSAT", template: "%s · Apex LSAT" },
  description: "A personal LSAT study system: visual lessons, adaptive drilling, blind review, and error-driven practice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-7xl">
          <SideNav />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
