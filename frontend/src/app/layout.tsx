import type { Metadata } from "next";
import { Caveat, Geist, Lora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AuthGuard from "@/components/auth/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const loraSerif = Lora({
  variable: "--font-lora-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const caveatHand = Caveat({
  variable: "--font-caveat-hand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Your Little World",
  description: "A private, whimsical, and tactile personal digital sanctuary.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${loraSerif.variable} ${caveatHand.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#13151A] text-[#EAE6DF]">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
