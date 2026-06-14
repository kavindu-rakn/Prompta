import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompta - Prompt Bank",
  description: "A simple, paper-like prompt bank for saving AI prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <h1>Prompta</h1>
          <span>Untitled - Notepad</span>
        </nav>
        {children}
      </body>
    </html>
  );
}
