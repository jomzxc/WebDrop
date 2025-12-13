import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { useRoom } from "@/lib/hooks/use-room"

const toastMock = jest.fn()

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}))

import { createClient } from "@/lib/supabase/client"

function Harness({ roomId }: { roomId: string | null }) {
  const api = useRoom(roomId)
  ;(globalThis as any).__roomApi = api
  return <div />
}

const flushPromises = async () => {
  // Flush a couple of microtask turns to allow effects + async callbacks to settle.
  await Promise.resolve()
  await Promise.resolve()
}

class FakeChannel {
  private handlers: {
    postgres?: ((payload: any) => void)[]
    presence: Record<string, ((payload: any) => void)[]>
  } = { presence: {} }

  track = jest.fn(async () => {})
  presenceState = jest.fn(() => ({}))

  on(event: string, filter: any, callback: (payload: any) => void) {
    if (event === "postgres_changes") {
      this.handlers.postgres = this.handlers.postgres || []
      this.handlers.postgres.push(callback)
      return this
    }

    if (event === "presence") {
      const key = filter?.event || "unknown"
      this.handlers.presence[key] = this.handlers.presence[key] || []
      this.handlers.presence[key].push(callback)
      return this
    }

    return this
  }

  subscribe = jest.fn((cb: (status: string, err?: any) => void) => {
    cb("SUBSCRIBED")
  })

  emitPresence(event: "sync" | "join" | "leave", payload: any = {}) {
    const list = this.handlers.presence[event] || []
    list.forEach((fn) => fn(payload))
  }
}

describe("useRoom", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    toastMock.mockReset()
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    })
    global.fetch = jest.fn()
  })

  test("joinRoom throws for invalid id length", async () => {
    render(<Harness roomId={null} />)
    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>

    await expect(api.joinRoom("ABC")).rejects.toThrow(/8 characters/i)
  })

  test("createRoom toasts and returns room id on success", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ room: { id: "ABCDEFGH" } }),
    })

    render(<Harness roomId={null} />)
    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>

    let id: string | undefined
    await act(async () => {
      id = await api.createRoom()
    })
    expect(id).toBe("ABCDEFGH")

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Room created",
      }),
    )
  })

  test("createRoom toasts destructive and rethrows on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "boom" }),
    })

    render(<Harness roomId={null} />)
    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>

    await act(async () => {
      await expect(api.createRoom()).rejects.toThrow(/failed to create room/i)
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        variant: "destructive",
      }),
    )
  })

  test("joinRoom calls API and returns room on success", async () => {
    const room = { id: "ABCDEFGH" }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ room }),
    })

    render(<Harness roomId={null} />)
    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>

    let result: any
    await act(async () => {
      result = await api.joinRoom("ABCDEFGH")
    })
    expect(result).toEqual(room)

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Joined room",
      }),
    )
  })

  test("leaveRoom clears peers and toasts on success", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<Harness roomId={null} />)
    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>

    await act(async () => {
      await api.leaveRoom("ABCDEFGH")
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Left room",
      }),
    )
  })

  test("fetchPeers populates peers and maps avatar_url from joined profiles", async () => {
    const channel = new FakeChannel()

    const peersData = [
      {
        id: "p1",
        room_id: "ROOM1",
        user_id: "u1",
        username: "Alice",
        joined_at: "",
        last_seen: "",
        profiles: { avatar_url: "alice.png" },
      },
      {
        id: "p2",
        room_id: "ROOM1",
        user_id: "u2",
        username: "Bob",
        joined_at: "",
        last_seen: "",
        profiles: null,
      },
    ]

    const order = jest.fn(async () => ({ data: peersData, error: null }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    const removeChannel = jest.fn()

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from,
      channel: jest.fn(() => channel),
      removeChannel,
    })

    render(<Harness roomId="ROOM1" />)

    await act(async () => {
      await flushPromises()
    })

    await waitFor(() => {
      const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
      expect(api.peers.length).toBe(2)
    })

    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
    expect(api.peers[0]).toEqual(
      expect.objectContaining({
        username: "Alice",
        avatar_url: "alice.png",
      }),
    )
    expect(api.peers[1]).toEqual(
      expect.objectContaining({
        username: "Bob",
        avatar_url: null,
      }),
    )

    // Ensure the channel tracked presence after subscribe.
    await waitFor(() => expect(channel.track).toHaveBeenCalled())
  })

  test("presence sync/join/leave updates onlineUserIds", async () => {
    const channel = new FakeChannel()
    channel.presenceState.mockReturnValue({ me: [{ key: "me" }], u1: [{ key: "u1" }] })

    const order = jest.fn(async () => ({ data: [], error: null }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from,
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    })

    render(<Harness roomId="ROOM1" />)

    await act(async () => {
      await flushPromises()
    })

    await act(async () => {
      channel.emitPresence("sync")
    })

    await waitFor(() => {
      const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
      expect(api.onlineUserIds.has("me")).toBe(true)
      expect(api.onlineUserIds.has("u1")).toBe(true)
    })

    await act(async () => {
      channel.emitPresence("join", { newPresences: [{ key: "u2" }] })
    })

    await waitFor(() => {
      const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
      expect(api.onlineUserIds.has("u2")).toBe(true)
    })

    await act(async () => {
      channel.emitPresence("leave", { leftPresences: [{ key: "u1" }] })
    })

    await waitFor(() => {
      const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
      expect(api.onlineUserIds.has("u1")).toBe(false)
    })
  })

  test("subscription error toasts destructive", async () => {
    const channel = new FakeChannel()
    channel.subscribe = jest.fn((cb: (status: string, err?: any) => void) => cb("CHANNEL_ERROR", { message: "nope" }))

    const order = jest.fn(async () => ({ data: [], error: null }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from,
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    })

    render(<Harness roomId="ROOM1" />)

    await act(async () => {
      await flushPromises()
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Realtime connection issue",
        variant: "destructive",
      }),
    )
  })

  test("fetchPeers error toasts destructive and keeps peers empty", async () => {
    const channel = new FakeChannel()
    const order = jest.fn(async () => ({ data: null, error: new Error("db down") }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from,
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    })

    render(<Harness roomId="ROOM1" />)

    await act(async () => {
      await flushPromises()
    })

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to fetch peers",
          variant: "destructive",
        }),
      )
    })

    const api = (globalThis as any).__roomApi as ReturnType<typeof useRoom>
    expect(api.peers).toEqual([])
  })

  test("cleanup removes realtime channel on unmount", async () => {
    const channel = new FakeChannel()

    const order = jest.fn(async () => ({ data: [], error: null }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    const removeChannel = jest.fn()

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from,
      channel: jest.fn(() => channel),
      removeChannel,
    })

    const { unmount } = render(<Harness roomId="ROOM1" />)

    await act(async () => {
      await flushPromises()
    })

    unmount()

    expect(removeChannel).toHaveBeenCalledWith(channel)
  })
})
