import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Live — team updates and live scores",
  description:
    "Follow IPL franchises, get notified the moment their details change, and watch the demo match live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
