/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}))

import { createClient } from "@/lib/supabase/server"
import { POST } from "@/app/api/rooms/create/route"

describe("POST /api/rooms/create", () => {
  const realRandom = Math.random

  beforeEach(() => {
    jest.resetAllMocks()
    // Make room IDs deterministic
    ;(Math.random as unknown as jest.Mock) = jest.fn(() => 0.123456789)
  })

  afterEach(() => {
    Math.random = realRandom
  })

  test("returns 401 when unauthenticated", async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    })

    const res = await POST()
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  test("creates room and inserts creator as peer", async () => {
    const roomsInsert = jest.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: "4FZZZXJY" }, error: null }),
      }),
    }))
    const peersInsert = jest.fn(async () => ({ error: null }))

    const roomsDeleteEq = jest.fn(async () => ({ error: null }))
    const roomsDelete = jest.fn(() => ({ eq: roomsDeleteEq }))

    const profilesSingle = jest.fn(async () => ({ data: { username: "alice" }, error: null }))
    const profilesEq = jest.fn(() => ({ single: profilesSingle }))
    const profilesSelect = jest.fn(() => ({ eq: profilesEq }))

    const from = (table: string) => {
      if (table === "rooms") return { insert: roomsInsert, delete: roomsDelete }
      if (table === "profiles") return { select: profilesSelect }
      if (table === "peers") return { insert: peersInsert }
      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "alice@example.com" } },
          error: null,
        }),
      },
      from,
    })

    const res = await POST()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.room).toBeTruthy()
    expect(body.room.id).toMatch(/^[A-Z0-9]{8}$/)

    // Creator should be inserted as a peer
    expect(peersInsert).toHaveBeenCalledTimes(1)

    // No cleanup should occur
    expect(roomsDelete).not.toHaveBeenCalled()
  })

  test("cleans up room if peer insert fails", async () => {
    const roomsInsert = jest.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: "4FZZZXJY" }, error: null }),
      }),
    }))
    const peersInsert = jest.fn(async () => ({ error: { message: "peer insert failed" } }))

    const roomsDeleteEq = jest.fn(async () => ({ error: null }))
    const roomsDelete = jest.fn(() => ({ eq: roomsDeleteEq }))

    const profilesSingle = jest.fn(async () => ({ data: { username: null }, error: null }))
    const profilesEq = jest.fn(() => ({ single: profilesSingle }))
    const profilesSelect = jest.fn(() => ({ eq: profilesEq }))

    const from = (table: string) => {
      if (table === "rooms") return { insert: roomsInsert, delete: roomsDelete }
      if (table === "profiles") return { select: profilesSelect }
      if (table === "peers") return { insert: peersInsert }
      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "alice@example.com" } },
          error: null,
        }),
      },
      from,
    })

    const res = await POST()
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "Failed to initialize room" })

    expect(roomsDelete).toHaveBeenCalledTimes(1)
    expect(roomsDeleteEq).toHaveBeenCalledTimes(1)
  })
})
