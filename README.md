# WebDrop: Peer-to-Peer File Transfer

WebDrop is a high-speed, secure, peer-to-peer file transfer application. It uses WebRTC for direct browser-to-browser communication, meaning your files are never uploaded to a central server. All signaling and room management is handled securely by Supabase.

## ✨ Features

* **Secure P2P Transfer:** Files are sent directly between users using encrypted WebRTC data channels.
* **Room-Based Connections:** Users can create a private room or join an existing one with an 8-character ID.
* **Real-time Presence:** See who is online in your room with live status updates (Connecting, Live, Offline) powered by Supabase Presence.
* **User Authentication:** Secure sign-up and login with Email or GitHub.
* **Profile Management:** Users can update their username and profile picture.
* **Custom Avatars:** Upload your own profile picture with client-side resizing for speed and efficiency.
* **Robust Error Handling:** Gracefully handles page refreshes and browser disconnects.

## 💻 Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Backend & Auth:** Supabase (Auth, Postgres, Realtime, Presence, Storage)
* **P2P:** WebRTC (RTCPeerConnection, RTCDataChannel)
* **Styling:** Tailwind CSS & shadcn/ui
* **Icons:** Lucide-React

---

## 🚀 Getting Started

To run this project, you will need a Supabase project.

### 1. Supabase Setup

1.  Go to [Supabase.com](https://supabase.com) and create a new project.
2.  Go to the **SQL Editor** (`<>` icon).
3.  Copy the contents of the following files from the `/scripts` directory and run them.
4.  **Enable GitHub Auth:**
    * Go to **Authentication** -> **Providers**.
    * Enable **GitHub**. You will need to add your GitHub App's Client ID and Secret.
    * **IMPORTANT:** Add `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback` as the callback URL in your GitHub OAuth App settings.

5.  **Configure Site URLs:**
    * Go to **Authentication** -> **URL Configuration**.
    * Add your deployment URL (e.g., `https://your-app.vercel.app`) and local dev URL (`http://localhost:3000`) to the **Site URL** and **Redirect URLs** fields.
    * Add `http://localhost:3000/**` to the Redirect URLs for local development.

### 2. Local Development

1.  Clone the repository:
    \`\`\`bash
    git clone [https://github.com/](https://github.com/)[YOUR_USERNAME]/[YOUR_REPO].git
    cd [YOUR_REPO]
    \`\`\`

2.  Install dependencies (using `pnpm` as defined in your lockfile):
    \`\`\`bash
    pnpm install
    \`\`\`

3.  Set up environment variables:
    * Find your Supabase Project URL and Anon Key in **Project Settings** -> **API**.
    * Create a new file named `.env.local` in the root of the project.
    * Add your keys to it:
        \`\`\`
        NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
        NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
        \`\`\`

4.  Run the development server:
    \`\`\`bash
    pnpm dev
    \`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the running application.

---

## ⚠️ File Size Limit

This application is designed to chunk files and send them peer-to-peer. The file chunks are re-assembled in the **receiver's browser memory (RAM)**.

To prevent browser crashes on low-memory devices, there is a hard-coded limit of **500 MB** per file. This is set as a constant `MAX_FILE_SIZE` in `lib/hooks/use-file-transfer.ts`. You can increase this, but be aware that it significantly increases the risk of crashing the receiver's browser.
