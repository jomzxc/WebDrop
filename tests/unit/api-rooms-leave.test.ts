/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}))

import { createClient } from "@/lib/supabase/server"
import { POST } from "@/app/api/rooms/leave/route"

function jsonRequest(body: any) {
  return new Request("http://localhost/api/rooms/leave", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/rooms/leave", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test("returns 401 when unauthenticated", async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: "ABCDEFGH" }))
    expect(res.status).toBe(401)
  })

  test("returns 400 for invalid roomId", async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: 123 }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "Invalid room ID" })
  })

  test("removes peer and returns success even if room cannot be deleted", async () => {
    const peersDeleteEqUser = jest.fn(async () => ({ error: null }))
    const peersDeleteEqRoom = jest.fn(() => ({ eq: peersDeleteEqUser }))
    const peersDelete = jest.fn(() => ({ eq: peersDeleteEqRoom }))

    const roomsDeleteEq = jest.fn(async () => ({ error: { message: "room not empty" } }))
    const roomsDelete = jest.fn(() => ({ eq: roomsDeleteEq }))

    const from = (table: string) => {
      if (table === "peers") return { delete: peersDelete }
      if (table === "rooms") return { delete: roomsDelete }
      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      from,
    })

    const res = await POST(jsonRequest({ roomId: "ABCDEFGH" }))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })

    expect(peersDelete).toHaveBeenCalledTimes(1)
    expect(roomsDelete).toHaveBeenCalledTimes(1)
  })
})
