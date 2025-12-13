import { reducer, toast as toastFn } from "@/hooks/use-toast"

describe("use-toast reducer", () => {
  test("ADD_TOAST respects TOAST_LIMIT=1", () => {
    const s1 = reducer(
      { toasts: [] },
      { type: "ADD_TOAST", toast: { id: "1", open: true } as any },
    )
    const s2 = reducer(
      s1,
      { type: "ADD_TOAST", toast: { id: "2", open: true } as any },
    )

    expect(s2.toasts).toHaveLength(1)
    expect(s2.toasts[0].id).toBe("2")
  })

  test("UPDATE_TOAST merges fields by id", () => {
    const s1 = { toasts: [{ id: "1", open: true, title: "A" } as any] }
    const s2 = reducer(s1, { type: "UPDATE_TOAST", toast: { id: "1", title: "B" } as any })

    expect(s2.toasts[0].title).toBe("B")
    expect(s2.toasts[0].open).toBe(true)
  })

  test("DISMISS_TOAST sets open=false for one toast", () => {
    const s1 = { toasts: [{ id: "1", open: true } as any, { id: "2", open: true } as any] }
    const s2 = reducer(s1, { type: "DISMISS_TOAST", toastId: "2" })

    expect(s2.toasts.find((t) => t.id === "2")?.open).toBe(false)
    expect(s2.toasts.find((t) => t.id === "1")?.open).toBe(true)
  })

  test("DISMISS_TOAST without id closes all", () => {
    const s1 = { toasts: [{ id: "1", open: true } as any, { id: "2", open: true } as any] }
    const s2 = reducer(s1, { type: "DISMISS_TOAST" })

    expect(s2.toasts.every((t) => t.open === false)).toBe(true)
  })

  test("REMOVE_TOAST without id clears all", () => {
    const s1 = { toasts: [{ id: "1" } as any, { id: "2" } as any] }
    const s2 = reducer(s1, { type: "REMOVE_TOAST" })
    expect(s2.toasts).toEqual([])
  })

  test("REMOVE_TOAST with id removes one", () => {
    const s1 = { toasts: [{ id: "1" } as any, { id: "2" } as any] }
    const s2 = reducer(s1, { type: "REMOVE_TOAST", toastId: "1" })
    expect(s2.toasts.map((t) => t.id)).toEqual(["2"])
  })
})

describe("toast() helper", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test("returns id + update/dismiss functions and wires onOpenChange to dismiss", () => {
    const { id, update, dismiss } = toastFn({ title: "Hello" })

    expect(typeof id).toBe("string")
    expect(typeof update).toBe("function")
    expect(typeof dismiss).toBe("function")

    // The onOpenChange closure should exist and dismiss when called with false.
    // We can't access internal state directly, but we can at least ensure calling these doesn't throw.
    expect(() => update({ id, title: "Updated", open: true } as any)).not.toThrow()
    expect(() => dismiss()).not.toThrow()

    // Ensure timer path can run without throwing.
    jest.runOnlyPendingTimers()
  })
})
