import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const heading = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Post",
  description: "Publish something.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Post",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F6F1E7",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={heading.variable}>
      <body className="bg-paper text-ink antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
