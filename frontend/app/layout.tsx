import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "CRM-Hausecare",
  description: "CRM para gestao de leads de Home Care",
  icons: {
    icon: "/nova-logo-web-2026-icon-4267x4267.png",
    shortcut: "/nova-logo-web-2026-icon-4267x4267.png",
    apple: "/nova-logo-web-2026-icon-4267x4267.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={figtree.className} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
