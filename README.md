# Rool Tutoring

An AI-powered quiz app for parents who want to help their children revise. You chat with an AI tutor to create tailored quizzes, then your child logs in and takes them — with their own friendly AI assistant giving personalised feedback.

Built with [Svelte 5](https://svelte.dev/) on [Rool Spaces](https://rool.dev/), which handles authentication, AI, and persistent data storage. No database to set up.

## How It Works

```
Parent (owner)                          Child (student)
─────────────────                       ─────────────────
1. Log in                               1. Log in
2. Chat with AI tutor                   2. See quizzes waiting
3. Describe your child's topics         3. Take a quiz
4. AI generates quiz questions          4. Get personalised AI feedback
5. Add your child via Users tab         5. Ask the AI for help on topics
6. Review their results
```

The parent and child share the same data (questions, quizzes, results) but have **separate conversations** — the parent sees the authoring chat, the child sees a friendly assistant. The child never sees the parent's authoring messages, and the parent can review how their child did.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A [Rool](https://rool.dev/) account (free — sign up at [rool.dev](https://rool.dev/))

Your child will also need their own Rool account to log in separately.

## Getting Started

```bash
git clone https://github.com/stamselberg/rool-tutoring.git
cd rool-tutoring
pnpm install
pnpm dev
```

This starts a local dev server (usually `http://localhost:5173`). The first time you open it, you'll be prompted to log in with your Rool account.

### First run

1. **Log in** — you'll be redirected to Rool for authentication
2. **Chat with the AI** — describe your child's subject, year group, and topics. The AI will ask clarifying questions, then generate quiz questions
3. **Switch to Quiz** — take the quiz yourself to check the questions look right
4. **Add your child** — go to the Users tab, enter their Rool email, and add them as a Student
5. **Your child logs in** — they see quizzes waiting, take them, and get AI feedback

### Adding your child

The **Users** tab (visible only to you as the space owner) lets you:

- **Add by email** — search for your child's Rool account and add them as a Student
- **Link sharing** — set access level so anyone with the URL can join

Students (added as "editor" role) can take quizzes and chat with the AI assistant, but cannot see the authoring chat or manage other users.

## Project Structure

```
src/
├── App.svelte              # Root — auth, space setup, role-based routing
├── Header.svelte           # Navigation tabs (Chat, Quiz, Users)
├── Splash.svelte           # Login screen
├── Chat.svelte             # AI chat interface
├── Objects.svelte          # Debug panel (admin only)
├── QuizFlow.svelte         # Quiz state machine — select, take, results
├── QuestionScreen.svelte   # Renders one question (MC, T/F, fill-in)
├── Results.svelte          # Score, topic breakdown, AI feedback
├── Users.svelte            # User management (add/remove, link sharing)
├── systemInstruction.ts    # AI persona for the parent (quiz authoring)
├── studentInstruction.ts   # AI persona for the student (friendly assistant)
├── checkAnswer.ts          # Client-side answer validation
├── types.ts                # TypeScript types for questions, quizzes, etc.
└── main.ts                 # Entry point
docs/
├── ARCHITECTURE.md         # Data model, component map, design decisions
├── ITERATION-1.md          # Build log from the first working version
├── USER-MANAGEMENT.md      # How multi-user access works (with diagrams)
└── VISION.md               # Long-term direction, Oak Academy API, scenarios
```

## Tech Stack

| Layer     | Technology                                                                            |
| --------- | ------------------------------------------------------------------------------------- |
| Framework | [Svelte 5](https://svelte.dev/) with runes (`$state`, `$derived`, `$effect`)          |
| Styling   | [Tailwind CSS v4](https://tailwindcss.com/)                                           |
| AI + Data | [Rool Spaces](https://rool.dev/) — handles auth, AI conversations, and object storage |
| Build     | [Vite](https://vite.dev/)                                                             |
| Language  | TypeScript                                                                            |

## How Rool Fits In

[Rool Spaces](https://rool.dev/) is the backend. It provides:

- **Authentication** — login/logout, user accounts
- **AI conversations** — each user gets their own chat with configurable system instructions
- **Object storage** — questions, quizzes, and attempt results are stored as objects in a shared space
- **Multi-user access** — invite users by email with role-based permissions (owner, admin, editor)

There is no separate database, no API server, and no deployment pipeline. The app runs entirely as a client-side Svelte app that talks to Rool.

A few Rool concepts that map to the app:

- **Space** — one tutoring environment with its own data and users. The app creates one called "Tutoring" on first run.
- **Roles** — you're the owner; your child is added as an editor (called "Student" in the UI). Editors can take quizzes and chat but can't manage users.
- **Conversations** — each user gets their own AI chat within the shared space. Separate histories, separate AI personas, same quiz data.
- **Objects** — questions, quizzes, and results are stored as JSON objects. The AI creates questions; the app creates results when a quiz is completed.

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # Run TypeScript + Svelte type checks
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — data model, component map, diagram strategy, design decisions
- [User Management](docs/USER-MANAGEMENT.md) — how multi-user access and per-user conversations work (includes Mermaid diagrams)
- [Vision](docs/VISION.md) — long-term direction, Oak National Academy API, user scenarios
- [Memory](docs/memory/) — hard-won lessons, organised by topic. Things that aren't obvious from reading the code or Rool's own docs. Keep entries selective — if the code already says it, don't repeat it here

## License

Not yet licensed. Shared for collaboration — contributions and ideas welcome.
