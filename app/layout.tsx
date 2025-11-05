import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import DarkModeProvider from "@/components/dark-mode-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "WebDrop - Secure P2P File Transfer",
  description:
    "Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers.",
  generator: "v0.app",
  keywords: ["file transfer", "p2p", "peer-to-peer", "secure", "webrtc", "file sharing"],
  authors: [{ name: "WebDrop" }],
  openGraph: {
    title: "WebDrop - Secure P2P File Transfer",
    description: "Fast, secure file sharing through direct peer-to-peer connections",
    type: "website",
  },
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
