import type { Metadata } from "next";
// Geist 폰트 가져오는 부분은 건드리지 않음
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Booth Prototype - Fixed",
  description: "Color and background fix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 🔥 모든 Geist 클래스 제거! 순수한 body만 남김 */}
      <body>
        {children}
      </body>
    </html>
  );
}