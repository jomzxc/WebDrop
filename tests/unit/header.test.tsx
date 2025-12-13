import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Header from "@/components/header"

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

describe("Header", () => {
  const push = jest.fn()
  const refresh = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
    push.mockReset()
    refresh.mockReset()

    ;(useRouter as jest.Mock).mockReturnValue({ push, refresh })

    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    })
    document.documentElement.classList.remove("dark")
    localStorage.removeItem("theme")
  })

  test("renders sign-in when logged out and toggles dark mode", async () => {
    const user = userEvent.setup()

    render(<Header />)

    expect(screen.getByText(/webdrop/i)).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: /sign in/i })).toBeInTheDocument()

    const toggle = screen.getByRole("button", { name: /toggle dark mode/i })

    await waitFor(() => {
      // toggle is only active once mounted
      expect(toggle).toBeEnabled()
    })

    expect(document.documentElement.classList.contains("dark")).toBe(false)

    await user.click(toggle)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("theme")).toBe("dark")
  })

  test("shows sign-in when initial auth lookup fails", async () => {
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: async () => {
          throw new Error("auth down")
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    })

    const { container } = render(<Header />)

    // While authLoading is true, a spinner is rendered.
    expect(container.querySelector(".animate-spin")).toBeTruthy()

    expect(await screen.findByRole("link", { name: /sign in/i })).toBeInTheDocument()
  })

  test("renders user dropdown with profile info and signs out", async () => {
    const user = userEvent.setup()
    const signOut = jest.fn(async () => {})

    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "alice@example.com" } },
          error: null,
        }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
        signOut,
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { username: "Alice", avatar_url: "https://example.com/a.png" }, error: null }),
          }),
        }),
      }),
    })

    const { container } = render(<Header />)

    // AvatarFallback should prefer username initials.
    expect(await screen.findByText("AL")).toBeInTheDocument()

    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    await user.click(trigger!)

    expect(await screen.findByText(/profile settings/i)).toBeInTheDocument()
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
    expect(screen.getByText(/alice@example\.com/i)).toBeInTheDocument()

    await user.click(screen.getByText(/sign out/i))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith("/auth/login")
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  test("falls back to email initials when profile is missing; falls back to 'U' when email is missing", async () => {
    const user = userEvent.setup()

    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "ab@example.com" } },
          error: null,
        }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    })

    const { container, unmount } = render(<Header />)

    expect(await screen.findByText("AB")).toBeInTheDocument()
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    await user.click(trigger!)
    expect(await screen.findByText(/^User$/)).toBeInTheDocument()
    expect(screen.getByText(/ab@example\.com/i)).toBeInTheDocument()

    unmount()

    // Now cover the final fallback branch: no username and no email.
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u2" } },
          error: null,
        }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    })

    render(<Header />)

    expect(await screen.findByText("U")).toBeInTheDocument()
  })
})
