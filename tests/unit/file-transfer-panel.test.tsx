import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import FileTransferPanel from "@/components/file-transfer-panel"

describe("FileTransferPanel", () => {
  test("selects files, chooses recipient, and calls onFileSelect", async () => {
    const user = userEvent.setup()
    const onFileSelect = jest.fn()

    const { container } = render(
      <FileTransferPanel
        transfers={[]}
        peers={[
          { id: "p0", room_id: "r", user_id: "me", username: "Me", joined_at: "", last_seen: "", avatar_url: null } as any,
          { id: "p1", room_id: "r", user_id: "u1", username: "Alice", joined_at: "", last_seen: "", avatar_url: null } as any,
        ]}
        currentUserId="me"
        onFileSelect={onFileSelect}
      />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    const f = new File(["hello"], "hello.txt", { type: "text/plain" })

    // Manually create a FileList-like object; component only relies on length and indexing.
    const fileList = {
      0: f,
      length: 1,
      item: (index: number) => (index === 0 ? f : null),
    } as unknown as FileList

    fireEvent.change(input, { target: { files: fileList } })

    expect(await screen.findByText(/1 file selected/i)).toBeInTheDocument()

    // Choose recipient via Radix Select
    const combo = screen.getByRole("combobox")
    await user.click(combo)
    await user.click(await screen.findByText(/alice/i))

    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(onFileSelect).toHaveBeenCalledTimes(1)
    const [files, peerId] = onFileSelect.mock.calls[0]
    expect(peerId).toBe("u1")
    expect(files).toBeTruthy()
    expect(files.length).toBe(1)
  })

  test("renders transfers list with progress", () => {
    render(
      <FileTransferPanel
        peers={[]}
        currentUserId="me"
        onFileSelect={jest.fn()}
        transfers={[
          {
            id: "t1",
            fileName: "a.txt",
            fileSize: 1024,
            progress: 100,
            status: "completed",
            direction: "sending",
            peerName: "Alice",
          } as any,
        ]}
      />,
    )

    expect(screen.getByText(/transfers \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/a\.txt/i)).toBeInTheDocument()
    expect(screen.getByText(/100%/i)).toBeInTheDocument()
  })
})
