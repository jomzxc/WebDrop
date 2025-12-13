import React from "react"
import { render, screen } from "@testing-library/react"
import { ThemeProvider } from "@/components/theme-provider"

describe("ThemeProvider", () => {
  test("renders children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div>hello</div>
      </ThemeProvider>,
    )

    expect(screen.getByText("hello")).toBeInTheDocument()
  })
})
