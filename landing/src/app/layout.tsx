import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030303",
};

export const metadata: Metadata = {
  title: "NexxCloud | Your Private Cloud, Running Like an OS",
  description: "Self-hosted file storage with resumable uploads, content-addressed blobs, signed media delivery, one-command Docker deployment, and Windows and Android clients.",
  keywords: [
    "self-hosted cloud",
    "private NAS",
    "open source cloud storage",
    "local-first storage",
    "developer cloud",
    "docker cloud server",
    "NexxCloud",
    "personal cloud server"
  ],
  authors: [{ name: "NexxCloud Team" }],
  openGraph: {
    title: "NexxCloud | Your Private Cloud, Running Like an OS",
    description: "Run a private file platform on your own hardware with one-command Docker deployment or the Windows server application.",
    type: "website",
    url: "https://github.com/ShadowSafin/NexxCloud",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans h-full bg-[#030303] text-[#F4F4F5] antialiased selection:bg-brand-cyan/20 selection:text-brand-cyan`}
      >
        {children}
      </body>
    </html>
  );
}
