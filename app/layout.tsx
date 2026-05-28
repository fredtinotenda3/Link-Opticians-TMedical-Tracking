// FILE: app/layout.tsx - Ensure AppShell wraps properly
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Link Optical — Claims Management",
  description: "Enterprise medical aid claims management platform for Link Optical Zimbabwe",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-gray-50">
        <AuthProvider>
          <CurrencyProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster position="top-right" richColors closeButton />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}