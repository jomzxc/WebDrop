import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomManager from '@/components/room-manager'

describe('RoomManager', () => {
  test('Create New Room calls onJoinRoom("create")', async () => {
    const user = userEvent.setup()
    const onJoinRoom = jest.fn()

    render(
      <RoomManager
        onJoinRoom={onJoinRoom}
        onLeaveRoom={jest.fn()}
        connected={false}
        roomId=""
        isLoading={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: /create new room/i }))
    expect(onJoinRoom).toHaveBeenCalledWith('create')
  })

  test('Join Room validates 8-char alphanumeric and uppercases', async () => {
    const user = userEvent.setup()
    const onJoinRoom = jest.fn()

    render(
      <RoomManager
        onJoinRoom={onJoinRoom}
        onLeaveRoom={jest.fn()}
        connected={false}
        roomId=""
        isLoading={false}
      />,
    )

    const input = screen.getByPlaceholderText(/enter room id/i)

    await user.type(input, 'abcd-123')
    await user.click(screen.getByRole('button', { name: /join room/i }))
    expect(onJoinRoom).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, 'abcd1234')
    await user.click(screen.getByRole('button', { name: /join room/i }))

    expect(onJoinRoom).toHaveBeenCalledWith('ABCD1234')
  })

  test('Join Room does nothing when input length is not 8', async () => {
    const user = userEvent.setup()
    const onJoinRoom = jest.fn()

    render(
      <RoomManager
        onJoinRoom={onJoinRoom}
        onLeaveRoom={jest.fn()}
        connected={false}
        roomId=""
        isLoading={false}
      />,
    )

    const input = screen.getByPlaceholderText(/enter room id/i)
    await user.type(input, 'abc')
    await user.keyboard('{Enter}')

    expect(onJoinRoom).not.toHaveBeenCalled()
  })

  test('Copy Room ID uses clipboard API when available', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <RoomManager
        onJoinRoom={jest.fn()}
        onLeaveRoom={jest.fn()}
        connected={true}
        roomId="ABCDEFGH"
        isLoading={false}
        isReadyToTransfer={true}
      />,
    )

    await user.click(screen.getByRole('button', { name: /copy room id/i }))
    expect(writeText).toHaveBeenCalledWith('ABCDEFGH')
  })

  test('Copy Room ID falls back when clipboard API fails and shows copied message', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const writeText = jest.fn().mockRejectedValue(new Error('no clipboard'))
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    const execCommand = jest.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    })

    render(
      <RoomManager
        onJoinRoom={jest.fn()}
        onLeaveRoom={jest.fn()}
        connected={true}
        roomId="ABCDEFGH"
        isLoading={false}
        isReadyToTransfer={true}
      />,
    )

    await user.click(screen.getByRole('button', { name: /copy room id/i }))

    expect(writeText).toHaveBeenCalledWith('ABCDEFGH')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.queryByText(/copied to clipboard/i)).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  test('Connected state shows waiting message when not ready to transfer', () => {
    render(
      <RoomManager
        onJoinRoom={jest.fn()}
        onLeaveRoom={jest.fn()}
        connected={true}
        roomId="ABCDEFGH"
        isLoading={false}
        isReadyToTransfer={false}
      />,
    )

    expect(screen.getByText(/waiting for peers to connect/i)).toBeInTheDocument()
  })
})
