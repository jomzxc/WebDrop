import React from "react"
import { render, screen } from "@testing-library/react"
import PeerList from "@/components/peer-list"

describe("PeerList", () => {
  test("shows other peers and connection status", () => {
    render(
      <PeerList
        peers={[
          { id: "p0", room_id: "r", user_id: "me", username: "Me", joined_at: "", last_seen: "", avatar_url: null } as any,
          { id: "p1", room_id: "r", user_id: "u1", username: "Alice", joined_at: "", last_seen: "", avatar_url: null } as any,
        ]}
        currentUserId="me"
        onlineUserIds={new Set(["u1"])}
        connectionStates={new Map([['u1', 'connected']])}
        onRefresh={jest.fn()}
      />,
    )

    expect(screen.getByText(/connected peers/i)).toBeInTheDocument()
    expect(screen.getByText(/alice/i)).toBeInTheDocument()
    expect(screen.getByText(/^connected$/i)).toBeInTheDocument()
    expect(screen.getByText(/live/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument()
  })

  test("shows waiting message when no other peers", () => {
    render(
      <PeerList
        peers={[{ id: "p0", room_id: "r", user_id: "me", username: "Me", joined_at: "", last_seen: "", avatar_url: null } as any]}
        currentUserId="me"
        onlineUserIds={new Set()}
        connectionStates={new Map()}
      />,
    )

    expect(screen.getByText(/waiting for peers to join/i)).toBeInTheDocument()
  })
})
