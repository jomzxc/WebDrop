# Contributing to WebDrop

Thank you for your interest in contributing to WebDrop! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:
- **Node.js** 18 or higher
- **npm** or **pnpm** package manager
- A **Supabase** account and project
- **Git** for version control
- A code editor (VS Code recommended)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/WebDrop.git
   cd WebDrop
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/jomzxc/WebDrop.git
   ```

4. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   # or
   pnpm install
   ```

5. **Set up Supabase**:
   - Create a new Supabase project
   - Run all SQL scripts in `/scripts` directory in order (see [README.md](README.md))
   - Configure authentication providers as needed

6. **Configure environment variables**:
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

7. **Start the development server**:
   ```bash
   npm run dev
   ```

---

## 💻 Development Workflow

### Running the App

- **Development mode**: `npm run dev` – Runs Next.js dev server on http://localhost:3000
- **Production build**: `npm run build` – Creates an optimized production build
- **Production mode**: `npm run start` – Runs the production build locally
- **Linting**: `npm run lint` – Runs ESLint (when configured)

### Project Structure

Familiarize yourself with the codebase structure:

```
WebDrop/
├── app/                    # Next.js App Router pages and routes
├── components/             # Reusable React components
│   └── ui/                 # shadcn/ui components
├── lib/                    # Core business logic
│   ├── hooks/              # Custom React hooks
│   ├── supabase/           # Supabase client and utilities
│   ├── webrtc/             # WebRTC connection and file transfer logic
│   └── types/              # TypeScript type definitions
├── scripts/                # Database migration SQL scripts
└── public/                 # Static assets
```

### Key Technologies to Understand

- **Next.js 16 (App Router)** – Server and client components, routing, API routes
- **TypeScript** – Type-safe JavaScript
- **React 19.2** – Component architecture, hooks, and state management
- **Supabase** – Authentication, database, real-time subscriptions, storage
- **WebRTC** – Peer-to-peer connections, data channels, signaling
- **Tailwind CSS** – Utility-first styling
- **shadcn/ui** – Component library built on Radix UI

---

## 🎨 Code Style

### General Guidelines

- **Use TypeScript** for all new files
- **Use functional components** with hooks (no class components)
- **Use async/await** instead of promise chains
- **Prefer named exports** over default exports (except for Next.js pages)
- **Keep components small and focused** – extract reusable logic into hooks or utilities

### Naming Conventions

- **Files**: Use kebab-case for files and folders (`user-profile.tsx`, `use-room.ts`)
- **Components**: Use PascalCase (`FileTransferPanel`, `RoomManager`)
- **Hooks**: Prefix with `use` in camelCase (`useFileTransfer`, `useRoom`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `CHUNK_SIZE`)
- **Functions/Variables**: Use camelCase (`sendFile`, `userId`)

### TypeScript

- **Always type function parameters and return values**
- **Avoid `any`** – use `unknown` or proper types
- **Use interfaces** for object shapes
- **Use type aliases** for unions, intersections, or utility types

Example:
```typescript
interface User {
  id: string
  username: string
  avatarUrl?: string
}

async function updateUsername(userId: string, newUsername: string): Promise<void> {
  // implementation
}
```

### React Component Style

```typescript
"use client" // Only when needed (for client components)

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface MyComponentProps {
  title: string
  onSubmit: (value: string) => void
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [value, setValue] = useState("")

  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={() => onSubmit(value)}>Submit</Button>
    </div>
  )
}
```

### Formatting

While the project doesn't currently use automated formatting tools like Prettier:
- Use **2 spaces** for indentation
- Use **double quotes** for strings
- Use **semicolons** at the end of statements
- Keep lines under **120 characters** when possible

> **Note:** Contributors are welcome to propose adding Prettier or ESLint with autofix as a future enhancement to automate code formatting.

---

## 🌿 Git Workflow

### Branching Strategy

- **`main`** – Production-ready code
- **Feature branches** – Create from `main` for new features or fixes

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` – New features (e.g., `feature/file-encryption`)
- `fix/` – Bug fixes (e.g., `fix/avatar-upload-error`)
- `refactor/` – Code refactoring (e.g., `refactor/webrtc-signaling`)
- `docs/` – Documentation updates (e.g., `docs/update-readme`)
- `chore/` – Maintenance tasks (e.g., `chore/update-dependencies`)

Example:
```bash
git checkout -b feature/add-file-preview
```

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation changes
- `style` – Code style changes (formatting, no logic change)
- `refactor` – Code refactoring (no feature change or bug fix)
- `perf` – Performance improvements
- `test` – Adding or updating tests
- `chore` – Maintenance tasks (dependencies, config, etc.)

**Examples:**
```bash
git commit -m "feat(room): add file preview before sending"
git commit -m "fix(auth): resolve GitHub OAuth callback error"
git commit -m "docs: update installation instructions"
git commit -m "refactor(webrtc): simplify signaling logic"
```

### Keeping Your Fork Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## 🧪 Testing

### Current State

WebDrop currently does not have automated tests. We welcome contributions to add:
- **Unit tests** for utility functions and hooks
- **Integration tests** for components
- **End-to-end tests** for critical user flows (authentication, room creation, file transfer)

### Testing Frameworks (Suggested)

If adding tests, consider:
- **Vitest** or **Jest** for unit and integration tests
- **Playwright** or **Cypress** for end-to-end tests
- **React Testing Library** for component tests

### Manual Testing

Before submitting a PR, manually test:

1. **Authentication flows**:
   - Sign up with email
   - Sign in with email
   - Sign in with GitHub OAuth
   - Sign out

2. **Profile management**:
   - Update username
   - Upload avatar image
   - View updated profile

3. **Room functionality**:
   - Create a new room
   - Join an existing room
   - See peer presence updates
   - Leave a room

4. **File transfer**:
   - Send a file to a peer
   - Receive a file from a peer
   - Monitor transfer progress
   - Cancel a transfer
   - Handle connection failures

5. **Error scenarios**:
   - Invalid room ID
   - Network disconnection during transfer
   - Authentication timeout
   - Large file upload

---

## 🔀 Pull Request Process

### Before Submitting

1. **Sync your fork** with upstream `main`
2. **Test your changes** thoroughly
3. **Run linting** (if configured): `npm run lint`
4. **Build the project** to check for errors: `npm run build`
5. **Review your changes** – ensure only necessary files are modified

### Creating a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a PR** on GitHub from your fork to `jomzxc/WebDrop:main`

3. **Fill out the PR template** with:
   - Clear description of changes
   - Motivation and context
   - Type of change (bug fix, new feature, etc.)
   - Testing performed
   - Screenshots (if UI changes)

4. **Link related issues** (if applicable):
   ```
   Closes #123
   Fixes #456
   ```

### PR Title Format

Use conventional commit format:
```
feat(room): add file preview before sending
fix(auth): resolve GitHub OAuth callback error
```

### PR Review Process

- A maintainer will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Your contribution will be credited

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's style guidelines
- [ ] Changes have been tested locally
- [ ] No unnecessary files are included (check `.gitignore`)
- [ ] Commit messages follow conventional format
- [ ] PR description clearly explains the changes
- [ ] Documentation is updated (if needed)
- [ ] No merge conflicts with `main`

---

## 🐛 Reporting Issues

### Bug Reports

When reporting a bug, include:

- **Clear title** – Briefly describe the issue
- **Steps to reproduce** – Detailed steps to trigger the bug
- **Expected behavior** – What should happen
- **Actual behavior** – What actually happens
- **Environment**:
  - Browser and version
  - Operating system
  - WebDrop version or commit hash
- **Screenshots or logs** – If applicable
- **Possible solution** – If you have ideas

### Feature Requests

When requesting a feature:

- **Use case** – Why is this feature needed?
- **Proposed solution** – How should it work?
- **Alternatives considered** – Other approaches you've thought about
- **Additional context** – Screenshots, mockups, or examples

### Security Issues

**Do not** open public issues for security vulnerabilities. Instead, email the maintainers directly or use GitHub's private security reporting feature.

---

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

---

## 📞 Getting Help

- **GitHub Discussions** – Ask questions or discuss ideas
- **Issues** – Report bugs or request features
- **README** – Check the main documentation

---

## 🎉 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes (for significant contributions)

---

Thank you for contributing to WebDrop! Your efforts help make peer-to-peer file sharing better for everyone. 🚀
