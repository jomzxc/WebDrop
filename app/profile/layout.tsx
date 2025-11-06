import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your WebDrop profile, update your username and avatar for file sharing.",
  openGraph: {
    title: "Profile - WebDrop",
    description: "Manage your WebDrop profile, update your username and avatar.",
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
