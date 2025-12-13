/**
 * @jest-environment node
 */

/**
 * These tests validate the API route behavior without needing a real Supabase project.
 * We mock the server-side Supabase client to cover validation branches deterministically.
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/rooms/join/route'

function jsonRequest(body: any) {
  return new Request('http://localhost/api/rooms/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/rooms/join', () => {
  test('returns 401 when unauthenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: 'ABCDEFGH' }))
    expect(res.status).toBe(401)
  })

  test('returns 400 for invalid roomId type', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: 123 }))
    expect(res.status).toBe(400)
  })

  test('returns 400 for wrong length', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: 'ABC' }))
    expect(res.status).toBe(400)
  })

  test('returns 400 for invalid characters', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
    })

    const res = await POST(jsonRequest({ roomId: 'ABCD-123' }))
    expect(res.status).toBe(400)
  })

  test('returns 404 when room not found or inactive', async () => {
    const from = (table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
      from,
    })

    const res = await POST(jsonRequest({ roomId: 'ABCDEFGH' }))
    expect(res.status).toBe(404)
  })

  test('returns 200 and existing peer when already joined', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    const room = { id: 'ABCDEFGH', is_active: true }
    const existingPeer = { id: 'p1', room_id: 'ABCDEFGH', user_id: 'u1' }

    const peersUpdateEq = jest.fn(async () => ({ error: null }))
    const peersUpdate = jest.fn(() => ({ eq: peersUpdateEq }))

    const from = (table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: room, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { username: 'alice' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'peers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: existingPeer, error: null }),
              }),
            }),
          }),
          update: peersUpdate,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from,
    })

    const res = await POST(jsonRequest({ roomId: 'ABCDEFGH' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.room).toEqual(room)
    expect(body.peer).toEqual(existingPeer)
    expect(peersUpdate).toHaveBeenCalledTimes(1)
    expect(peersUpdateEq).toHaveBeenCalledTimes(1)
  })

  test('returns 200 and inserts new peer when not already joined', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    const room = { id: 'ABCDEFGH', is_active: true }
    const newPeer = { id: 'p2', room_id: 'ABCDEFGH', user_id: 'u1' }

    const from = (table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: room, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { username: 'alice' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'peers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: newPeer, error: null }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from,
    })

    const res = await POST(jsonRequest({ roomId: 'ABCDEFGH' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.room).toEqual(room)
    expect(body.peer).toEqual(newPeer)
  })
})
