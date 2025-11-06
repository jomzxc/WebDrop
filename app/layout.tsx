import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import DarkModeProvider from "@/components/dark-mode-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  metadataBase: new URL('https://webdrop.jomszxc.tech'),
  title: {
    default: "WebDrop - Secure P2P File Transfer",
    template: "%s | WebDrop",
  },
  description:
    "Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers. Transfer files up to 500MB with end-to-end encryption using WebRTC technology.",
  applicationName: "WebDrop",
  generator: "Next.js",
  keywords: [
    "file transfer",
    "p2p",
    "peer-to-peer",
    "secure file sharing",
    "webrtc",
    "file sharing",
    "encrypted file transfer",
    "direct file transfer",
    "no upload limits",
    "browser file sharing",
    "private file sharing",
    "instant file transfer",
    "webdrop",
  ],
  authors: [{ name: "WebDrop Team", url: "https://github.com/jomzxc/WebDrop" }],
  creator: "WebDrop Team",
  publisher: "WebDrop",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://webdrop.jomszxc.tech",
    siteName: "WebDrop",
    title: "WebDrop - Secure P2P File Transfer",
    description:
      "Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "WebDrop - Secure P2P File Transfer",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WebDrop - Secure P2P File Transfer",
    description:
      "Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers.",
    images: ["/og-image.svg"],
    creator: "@webdrop",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  // Note: Add verification codes after setting up Google Search Console and Yandex Webmaster
  // verification: {
  //   google: "your-google-site-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
  alternates: {
    canonical: "https://webdrop.jomszxc.tech",
  },
  category: "technology",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ErrorBoundary>
          <DarkModeProvider>
            {children}
            <Toaster />
          </DarkModeProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
