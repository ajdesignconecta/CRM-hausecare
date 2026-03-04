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
  description: "CRM para gestão de leads de Home Care"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={figtree.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
