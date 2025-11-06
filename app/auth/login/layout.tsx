import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login",
  description: "Login to WebDrop to start sharing files securely through peer-to-peer connections.",
  openGraph: {
    title: "Login - WebDrop",
    description: "Login to WebDrop to start sharing files securely through peer-to-peer connections.",
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
