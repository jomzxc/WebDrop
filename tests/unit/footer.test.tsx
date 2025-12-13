import React from "react"
import { render, screen } from "@testing-library/react"
import Footer from "@/components/footer"

describe("Footer", () => {
  test("renders brand and basic links", () => {
    render(<Footer />)

    expect(screen.getAllByText(/webdrop/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/quick links/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument()

    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })
})
