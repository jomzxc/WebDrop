import React from "react"
import { render, screen, act, waitFor } from "@testing-library/react"
import { useFileTransfer } from "@/lib/hooks/use-file-transfer"
import { FileTransferManager } from "@/lib/webrtc/file-transfer"

const toastMock = jest.fn()

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}))

import { createClient } from "@/lib/supabase/client"

function Harness({
  roomId,
  onReady,
}: {
  roomId: string
  onReady: (api: ReturnType<typeof useFileTransfer>) => void
}) {
  const api = useFileTransfer(roomId)

  React.useEffect(() => {
    onReady(api)
  }, [api, onReady])

  return (
    <div>
      <div data-testid="count">{api.transfers.length}</div>
      <ul>
        {api.transfers.map((t) => (
          <li key={t.id} data-testid={`t-${t.id}`}>{`${t.fileName}:${t.status}:${t.progress}`}</li>
        ))}
      </ul>
    </div>
  )
}

describe("useFileTransfer", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    toastMock.mockReset()
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      from: () => ({ insert: async () => ({ error: null }) }),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test("rejects files over MAX_FILE_SIZE", async () => {
    const sendSpy = jest.spyOn(FileTransferManager.prototype, "sendFile").mockResolvedValue(undefined)

    let api!: ReturnType<typeof useFileTransfer>
    render(
      <Harness
        roomId="ROOM1"
        onReady={(a) => {
          api = a
        }}
      />,
    )

    await waitFor(() => expect(api).toBeTruthy())

    const file = new File(["x"], "big.bin", { type: "application/octet-stream" })
    Object.defineProperty(file, "size", { value: 500 * 1024 * 1024 + 1 })

    await act(async () => {
      await api.sendFile(file, "peer1", "Bob", jest.fn())
    })

    expect(sendSpy).not.toHaveBeenCalled()

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "File too large",
        variant: "destructive",
      }),
    )
  })

  test("sends a valid file, updates progress, and logs transfer", async () => {
    jest.spyOn(FileTransferManager.prototype, "sendFile").mockImplementation(async (_file, _peerId, _sendData, onProgress) => {
      onProgress(42)
    })

    const insert = jest.fn(async () => ({ error: null }))
    const from = jest.fn(() => ({ insert }))

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      from,
    })

    let api!: ReturnType<typeof useFileTransfer>
    render(
      <Harness
        roomId="ROOM1"
        onReady={(a) => {
          api = a
        }}
      />,
    )

    await waitFor(() => expect(api).toBeTruthy())

    const file = new File(["hello"], "hello.txt", { type: "text/plain" })

    await act(async () => {
      await api.sendFile(file, "peer1", "Bob", jest.fn())
    })

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1")
    })

    const li = screen.getByText(/hello\.txt:completed:100/i)
    expect(li).toBeInTheDocument()

    // logged to DB
    expect(from).toHaveBeenCalledWith("file_transfers")
    expect(insert).toHaveBeenCalledTimes(1)

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "File sent",
        description: expect.stringContaining("hello.txt"),
      }),
    )
  })

  test("handleFileMetadata validates and adds a receiving transfer", async () => {
    const receiveMetadata = jest
      .spyOn(FileTransferManager.prototype, "receiveMetadata")
      .mockImplementation(() => {})

    let api!: ReturnType<typeof useFileTransfer>
    render(
      <Harness
        roomId="ROOM1"
        onReady={(a) => {
          api = a
        }}
      />,
    )

    await waitFor(() => expect(api).toBeTruthy())

    await act(async () => {
      api.handleFileMetadata({ id: "f1", name: "photo.png", size: 123 }, "Alice")
    })

    expect(receiveMetadata).toHaveBeenCalledWith({ id: "f1", name: "photo.png", size: 123 })

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1")
    })

    expect(screen.getByText(/photo\.png:transferring:0/i)).toBeInTheDocument()
  })

  test("handleFileComplete downloads blob and completes transfer", async () => {
    jest.spyOn(FileTransferManager.prototype, "receiveMetadata").mockImplementation(() => {})
    jest.spyOn(FileTransferManager.prototype, "getMetadata").mockReturnValue({ id: "f2", name: "a.txt", size: 2 } as any)
    jest.spyOn(FileTransferManager.prototype, "completeTransfer").mockReturnValue(new Blob(["ok"]))

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    let api!: ReturnType<typeof useFileTransfer>
    render(
      <Harness
        roomId="ROOM1"
        onReady={(a) => {
          api = a
        }}
      />,
    )

    await waitFor(() => expect(api).toBeTruthy())

    await act(async () => {
      api.handleFileMetadata({ id: "f2", name: "a.txt", size: 2 }, "Alice")
    })

    await act(async () => {
      api.handleFileComplete("f2")
    })

    await waitFor(() => {
      expect(screen.getByText(/a\.txt:completed:100/i)).toBeInTheDocument()
    })

    expect(clickSpy).toHaveBeenCalled()

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "File received",
      }),
    )
  })
})
