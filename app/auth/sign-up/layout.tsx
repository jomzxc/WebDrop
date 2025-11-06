import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free WebDrop account to start sharing files securely with peer-to-peer technology.",
  openGraph: {
    title: "Sign Up - WebDrop",
    description: "Create a free WebDrop account to start sharing files securely with peer-to-peer technology.",
  },
}

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
