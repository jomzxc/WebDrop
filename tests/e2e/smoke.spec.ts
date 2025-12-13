import { test, expect } from "@playwright/test"

// We stub Supabase network calls so E2E is deterministic and does not require real credentials.
// The UI should behave as "logged out".
async function stubSupabase(page: any) {
  await page.route("**/*", async (route: any) => {
    const url: string = route.request().url()

    if (url.includes(".supabase.co")) {
      // Most app flows use auth.getUser on landing; return 401 to indicate no session.
      if (url.includes("/auth/v1/user")) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ msg: "not authenticated" }),
        })
      }

      // Default stub for other supabase endpoints (prevent hanging).
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }

    return route.continue()
  })
}

test("landing page loads and Get Started goes to login when logged out", async ({ page }) => {
  await stubSupabase(page)

  await page.goto("/")

  await expect(page.getByRole("heading", { name: /share files instantly/i })).toBeVisible()

  await page.getByRole("button", { name: /get started/i }).click()
  await expect(page).toHaveURL(/\/auth\/login/i)
})
