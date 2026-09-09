import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import BootSequence from "@/components/BootSequence";
import Atmosphere from "@/components/Atmosphere";
import { ToastProvider } from "@/components/ToastProvider";
import ErrorReporter from "@/components/ErrorReporter";

export const metadata: Metadata = {
  title: "Prompta",
  description: "A hyper-futuristic prompt vault.",
  openGraph: {
    images: ["/promptalogo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Anti-flicker theme bootstrap. Lives in public/theme.js rather than
          inline so a future nonce-based CSP needs no script hash for it.

          This is a DELIBERATELY blocking script and the no-sync-scripts rule is
          suppressed on purpose. It must execute before the first paint, or the
          page renders in the wrong theme and then snaps to the right one.
          next/script strategy="beforeInteractive" does NOT work here: it emits
          a deferred `self.__next_s` loader entry that runs after Next.js
          bootstraps, which reintroduces the flash. Verified against the built
          HTML, not assumed. The cost is one render-blocking same-origin
          request of well under 1KB.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme.js" />
      </head>
      <body>
        <ErrorReporter />
        <BootSequence />
        <Atmosphere />
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
