import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Room",
  description: "Share files instantly with WebDrop's secure peer-to-peer file transfer. Create or join a room to start sharing.",
  openGraph: {
    title: "Room - WebDrop",
    description: "Share files instantly with WebDrop's secure peer-to-peer file transfer.",
  },
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
