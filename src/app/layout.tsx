import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generative AI Assistant",
  description: "A general-purpose AI chat assistant.",
};

// Explicit rather than relying on Next.js's default -- pins the mobile
// layout viewport to the device's actual width instead of the ~980px
// desktop-page fallback browsers use when no viewport meta is present,
// which is what makes a page look "zoomed in"/oversized on a phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
