# WebDrop

**Secure, peer-to-peer file sharing powered by WebRTC.**

WebDrop enables high-speed, direct file transfers between browsers without uploading to any central server. Your files go straight from sender to receiver using encrypted WebRTC data channels, ensuring privacy and speed.

---

## ✨ Features

- **True Peer-to-Peer Transfer** – Files are sent directly between users using encrypted WebRTC data channels. No files touch our servers.
- **Room-Based Connections** – Create or join private rooms using an 8-character room ID.
- **Real-Time Presence** – See who's online in your room with live status updates (Connecting, Live, Offline).
- **Secure Authentication** – Sign up and log in securely using Email or GitHub OAuth.
- **Profile Management** – Update your username and profile picture with client-side image resizing.
- **Custom Avatars** – Upload profile pictures stored securely in Supabase Storage.
- **Robust Connection Handling** – Gracefully handles page refreshes, browser disconnects, and reconnections.
- **File Size Support** – Transfer files up to 500MB (configurable limit to prevent memory issues).

---

## 🏗️ Architecture

WebDrop is built as a modern, serverless web application using Next.js and Supabase:

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Authentication** | Supabase Auth (Email + GitHub OAuth) |
| **Database** | Supabase Postgres |
| **Real-Time** | Supabase Realtime (Presence & Broadcast) |
| **Storage** | Supabase Storage (Avatar uploads) |
| **P2P Transfer** | WebRTC (RTCPeerConnection, RTCDataChannel) |
| **UI Framework** | React 19.2 |
| **Styling** | Tailwind CSS 4 + shadcn/ui components |
| **Icons** | Lucide React |
| **Package Manager** | npm / pnpm |

### How It Works

1. **Authentication** – Users sign up or log in via Supabase Auth (Email or GitHub).
2. **Room Creation/Join** – Users create a new room or join an existing one with a room ID.
3. **Presence & Signaling** – Supabase Realtime manages user presence and broadcasts WebRTC signaling messages (offers, answers, ICE candidates).
4. **WebRTC Connection** – Direct peer-to-peer connections are established between browsers.
5. **File Transfer** – Files are chunked and sent over encrypted WebRTC data channels, then reassembled in the receiver's browser.

**Signaling Flow:**
\`\`\`
User A (Initiator)          Supabase Realtime          User B (Responder)
      |                             |                           |
      |--- Broadcast Offer -------->|------ Forward Offer ----->|
      |                             |                           |
      |<----- Forward Answer -------|<----- Broadcast Answer ---|
      |                             |                           |
      |<---- Exchange ICE Candidates via Supabase Realtime ---->|
      |                             |                           |
      |============ WebRTC Direct Connection Established ========|
      |                             |                           |
      |<========= Encrypted File Transfer (P2P) ===============>|
\`\`\`

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm or pnpm
- A **Supabase** account and project ([supabase.com](https://supabase.com))
- (Optional) A **GitHub OAuth App** for GitHub authentication

### 1. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Anon Key** from **Project Settings → API**.

#### Run Database Migrations

Navigate to the **SQL Editor** in your Supabase dashboard and run the scripts in the `/scripts` directory **in order**:

1. `001_create_tables.sql` – Creates `profiles`, `peers`, and `rooms` tables
2. `002_create_policies.sql` – Sets up Row Level Security policies
3. `003_handle_new_user_trigger.sql` – Auto-creates profile on user signup
4. `004_handle_updated_at_trigger.sql` – Auto-updates `updated_at` timestamps
5. `005_add_peers_profile_fkey.sql` – Adds foreign key constraint to peers table
6. `006_enable_realtime.sql` – Enables Realtime on `peers` table
7. `007_avatar_storage.sql` – Creates `avatars` storage bucket with policies
8. `008_sync_username_trigger.sql` – Syncs username changes from profiles to peers

#### Enable GitHub Authentication (Optional)

1. Go to **Authentication → Providers** in Supabase.
2. Enable **GitHub** provider.
3. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers):
   - **Authorization callback URL**: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret** to Supabase.

#### Configure Site URLs

1. Go to **Authentication → URL Configuration** in Supabase.
2. Set **Site URL** to your production URL (e.g., `https://webdrop.vercel.app`) or `http://localhost:3000` for local dev.
3. Add **Redirect URLs**:
   - `http://localhost:3000/**` (local development wildcard)
   - `https://your-production-domain.com/**` (production wildcard)

### 2. Local Development

#### Clone the Repository

\`\`\`bash
git clone https://github.com/YOUR-USERNAME/WebDrop.git
cd WebDrop
\`\`\`

#### Install Dependencies

Using npm:
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

Or using pnpm:
\`\`\`bash
pnpm install
\`\`\`

#### Configure Environment Variables

Create a `.env.local` file in the project root:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

> **Note:** These values are found in **Supabase Dashboard → Project Settings → API**.

#### Run the Development Server

\`\`\`bash
npm run dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📦 Build & Deploy

### Build for Production

\`\`\`bash
npm run build
\`\`\`

The app can be built without environment variables (useful for CI/CD), but it requires valid Supabase credentials at runtime.

### Deploy to Vercel

WebDrop is optimized for deployment on Vercel:

1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

Vercel will automatically detect Next.js and configure the build.

### Other Platforms

WebDrop can be deployed to any platform that supports Next.js:
- **Netlify** – Use the Next.js plugin
- **Cloudflare Pages** – Use `@cloudflare/next-on-pages`
- **Self-hosted** – Use `npm run build && npm run start`

---

## 🧪 Testing

Currently, WebDrop does not include automated tests. Testing is done manually during development.

If you'd like to contribute tests, see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📁 Project Structure

\`\`\`
WebDrop/
├── app/                      # Next.js App Router pages
│   ├── auth/                 # Authentication pages (login, signup, callback)
│   ├── profile/              # User profile page
│   ├── room/                 # Room page for P2P transfers
│   ├── api/                  # API routes
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── file-transfer-panel.tsx
│   ├── header.tsx
│   ├── footer.tsx
│   ├── peer-list.tsx
│   └── room-manager.tsx
├── lib/                      # Utilities and business logic
│   ├── hooks/                # React hooks
│   │   ├── use-file-transfer.ts
│   │   └── use-room.ts
│   ├── supabase/             # Supabase client setup
│   ├── webrtc/               # WebRTC logic (signaling, file transfer)
│   ├── types/                # TypeScript type definitions
│   └── utils.ts              # Utility functions
├── scripts/                  # Supabase SQL migration scripts
├── styles/                   # Global styles
├── public/                   # Static assets
├── next.config.mjs           # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
\`\`\`

---

## ⚠️ File Size Limits

Files are chunked and transferred peer-to-peer, then reassembled in the **receiver's browser memory (RAM)**.

**Default limit:** 500MB per file

This limit is set in `lib/hooks/use-file-transfer.ts` as the `MAX_FILE_SIZE` constant. You can increase it, but be aware:
- Larger files require more memory on the receiver's device
- Low-memory devices may crash when receiving large files
- Consider your users' typical device capabilities

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Setting up your development environment
- Code style and conventions
- Submitting pull requests
- Reporting issues

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Links

- **GitHub:** [github.com/jomzxc/WebDrop](https://github.com/jomzxc/WebDrop)
- **Issues:** [github.com/jomzxc/WebDrop/issues](https://github.com/jomzxc/WebDrop/issues)

---

## 💡 Troubleshooting

### Files won't transfer
- Check browser console for WebRTC errors
- Ensure both users are in the same room
- Verify Supabase Realtime is enabled on the `peers` table
- Check that firewall/NAT allows WebRTC connections

### Authentication fails
- Verify environment variables are set correctly
- Check Supabase redirect URLs include your domain
- For GitHub OAuth, ensure callback URL matches Supabase settings

### Avatar upload fails
- Verify Supabase Storage bucket `avatars` exists
- Check storage policies allow authenticated users to upload
- Ensure file is under storage size limits

---

**Built with ❤️ using Next.js, Supabase, and WebRTC**
