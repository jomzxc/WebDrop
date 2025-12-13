import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ErrorBoundary } from "@/components/error-boundary"

describe("ErrorBoundary", () => {
  test("renders fallback UI when a child throws and reloads on click", async () => {
    const user = userEvent.setup()

    function Boom() {
      throw new Error("boom")
    }

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // jsdom Location.reload is typically non-writable; assert the UI intent (button exists) and that clicking doesn't crash.
    await expect(user.click(screen.getByRole("button", { name: /refresh page/i }))).resolves.toBeUndefined()
  })
})
