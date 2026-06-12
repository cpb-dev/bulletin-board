import type { Metadata, Viewport } from "next";
import { Quicksand, Patrick_Hand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-ui",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Our Little Board";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A cozy little bulletin board for the two of us.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2e2017",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${patrickHand.variable}`}>
        {children}
      </body>
    </html>
  );
}
