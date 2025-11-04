export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  created_by: string
  created_at: string
  is_active: boolean
}

// avatar_url will be joined from profiles table when needed
export interface Peer {
  id: string
  room_id: string
  user_id: string
  username: string
  joined_at: string
  last_seen: string
  avatar_url?: string | null // Made optional since it comes from join
}

export interface FileTransfer {
  id: string
  room_id: string
  sender_id: string
  receiver_id: string
  file_name: string
  file_size: number
  status: "pending" | "transferring" | "completed" | "failed"
  created_at: string
  completed_at: string | null
}
