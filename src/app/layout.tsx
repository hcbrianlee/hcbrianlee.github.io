import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Green Nudge Chat",
  description: "A ChatGPT-style assistant with green nudging for the Green Nudging AI experiment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
