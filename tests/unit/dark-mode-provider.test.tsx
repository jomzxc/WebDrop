import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import DarkModeProvider from "@/components/dark-mode-provider"

describe("DarkModeProvider", () => {
  test("applies initial theme from localStorage and renders wrapper after mount", async () => {
    localStorage.setItem("theme", "dark")
    document.documentElement.classList.remove("dark")

    const { container } = render(
      <DarkModeProvider>
        <div>child</div>
      </DarkModeProvider>,
    )

    expect(screen.getByText("child")).toBeInTheDocument()

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true)
      expect(container.querySelector(".relative.min-h-screen")).toBeTruthy()
    })
  })

  test("uses prefers-color-scheme when no theme is stored", async () => {
    localStorage.removeItem("theme")
    document.documentElement.classList.remove("dark")

    const originalMatchMedia = window.matchMedia
    window.matchMedia = () => ({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as any

    render(
      <DarkModeProvider>
        <div>child</div>
      </DarkModeProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    window.matchMedia = originalMatchMedia
  })

  test("respects a stored light theme", async () => {
    localStorage.setItem("theme", "light")
    document.documentElement.classList.add("dark")

    render(
      <DarkModeProvider>
        <div>child</div>
      </DarkModeProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })
  })
})
