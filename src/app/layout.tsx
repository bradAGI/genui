import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenUI · agent-rendered interfaces",
  description: "A web app where claude renders the entire UI at runtime.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
