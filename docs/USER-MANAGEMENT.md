# User Management in the Tutoring App

## The Problem

Rool spaces are **user-scoped by default**. When a new user logs into a Rool app, they only see spaces they own or have been explicitly added to. There is no automatic "app-level" sharing -- if a parent creates a space full of quizzes, their child logging in sees an empty space unless the parent grants access.

Rool provides SDK methods for user management (`searchUser`, `addUser`, `removeUser`, `listUsers`, `setLinkAccess`) but **no built-in UI** for any of it. The app must provide its own.

## How It Works

```mermaid
sequenceDiagram
    participant Owner as Parent (owner)
    participant App as Tutoring App
    participant Rool as Rool Platform
    participant Student as Child (editor)

    Note over Owner,Student: --- Setup Phase ---

    Owner->>App: Logs in, creates space
    App->>Rool: createSpace("Tutoring")
    App->>Rool: openSpace(id, conversationId: "tutoring")
    App->>Rool: setSystemInstruction(TUTOR_INSTRUCTION)
    Owner->>App: Chats with AI, generates quizzes
    App->>Rool: space.prompt() → creates question & quiz objects

    Note over Owner,Student: --- Sharing Phase ---

    Owner->>App: Opens "Users" tab
    Owner->>App: Enters child's email, selects "Student"
    App->>Rool: rool.searchUser("child@...")
    Rool-->>App: { id: "abc", email: "child@..." }
    App->>Rool: space.addUser("abc", "editor")

    Note over Owner,Student: --- Child Access ---

    Student->>App: Logs in
    App->>Rool: rool.spaces (listSpaces)
    Rool-->>App: [{ name: "Tutoring", role: "editor" }]
    App->>Rool: openSpace(id, conversationId: "student-abc")
    App->>Rool: setSystemInstruction(STUDENT_INSTRUCTION)
    Student->>App: Sees own chat + quizzes (not parent's chat)
```

## Rool's Role Model

Access control is **space-level only** -- if you can access a space, you see all objects in it. There are no object-level permissions.

```mermaid
graph TB
    OW["owner — full control + delete space + manage all users"]
    AD["admin — manage editors & viewers"]
    ED["editor — create, modify, delete objects"]
    VI["viewer — read-only (can query but not mutate)"]

    OW --> AD --> ED --> VI

    VI --> Space

    subgraph Space ["Rool Space: Tutoring"]
        Q1[Question objects]
        QZ[Quiz objects]
        A1[Attempt objects]
        C1[Conversations]
    end

    Parent["Parent (owner)"] -->|full access| Space
    Child["Child (editor)"] -->|read-write| Space

    style OW fill:#f3e8ff,stroke:#7c3aed
    style AD fill:#dbeafe,stroke:#2563eb
    style ED fill:#dcfce7,stroke:#16a34a
    style VI fill:#f3f4f6,stroke:#6b7280
    style Parent fill:#f3e8ff,stroke:#7c3aed
    style Child fill:#dcfce7,stroke:#16a34a
```

**Why editor, not viewer?** Students need the `editor` role because `Results.svelte` calls `space.createObject()` to store quiz attempts and `space.prompt()` to get AI feedback. Viewers cannot perform mutations.

## Per-User Conversations

Each user gets their own conversation within the shared space. This means separate chat histories and separate AI instructions, while all users see the same quiz/question objects.

```mermaid
graph TB
    subgraph Space ["Rool Space: Tutoring"]
        subgraph Objects ["Shared Objects"]
            Q[Questions]
            QZ[Quizzes]
            A[Attempts]
        end

        subgraph Conversations ["Separate Conversations"]
            TC["'tutoring'<br/>Parent's authoring chat<br/>TUTOR_INSTRUCTION"]
            SC1["'student-abc'<br/>Child 1's chat<br/>STUDENT_INSTRUCTION"]
            SC2["'student-def'<br/>Child 2's chat<br/>STUDENT_INSTRUCTION"]
        end
    end

    Parent["Parent (owner)"] --> TC
    Parent -->|creates| Q
    Parent -->|creates| QZ

    S1["Child 1 (editor)"] --> SC1
    S1 -->|reads| Q
    S1 -->|creates| A

    S2["Child 2 (editor)"] --> SC2
    S2 -->|reads| Q
    S2 -->|creates| A

    style TC fill:#f3e8ff,stroke:#7c3aed
    style SC1 fill:#dcfce7,stroke:#16a34a
    style SC2 fill:#dcfce7,stroke:#16a34a
    style Parent fill:#f3e8ff,stroke:#7c3aed
    style S1 fill:#dcfce7,stroke:#16a34a
    style S2 fill:#dcfce7,stroke:#16a34a
```

The conversation routing happens in `App.svelte` at space-open time:

- **Owner/admin** → `conversationId: 'tutoring'` with `SYSTEM_INSTRUCTION` (quiz authoring)
- **Editor (student)** → `conversationId: 'student-<userId>'` with `STUDENT_INSTRUCTION` (friendly assistant)

## Two Ways to Share

| Method       | SDK Call                                                | Who Gets Access                |
| ------------ | ------------------------------------------------------- | ------------------------------ |
| **By email** | `rool.searchUser(email)` then `space.addUser(id, role)` | One specific Rool user         |
| **By link**  | `space.setLinkAccess('viewer' \| 'editor')`             | Anyone who opens the space URL |

## Component Architecture

The Users tab is only visible to owners and admins. Students see Chat and Quiz only.

```mermaid
graph LR
    subgraph "App.svelte"
        R[rool client]
        S[space]
        M["mode: chat | quiz | users"]
        IA[isAdmin]
    end

    subgraph "Header.svelte"
        CT[Chat tab]
        QT[Quiz tab]
        UT["Users tab (owner/admin only)"]
    end

    subgraph "Users.svelte"
        LS["Link Sharing<br/>setLinkAccess()"]
        AU["Add User<br/>searchUser() → addUser()"]
        ML["Member List<br/>listUsers() / removeUser()"]
    end

    subgraph "QuizFlow.svelte"
        QF["Quiz state machine"]
        RS["Results.svelte<br/>creates attempt with studentId"]
    end

    R -->|prop| Users.svelte
    R -->|prop| QuizFlow.svelte
    S -->|prop| Users.svelte
    S -->|prop| QuizFlow.svelte
    M -->|controls visibility| UT
    IA -->|"true: Chat + Objects<br/>false: Chat only"| Chat.svelte
    UT -->|mode='users'| Users.svelte
    CT -->|mode='chat'| Chat.svelte
    QT -->|mode='quiz'| QuizFlow.svelte
    QF --> RS

    style UT fill:#dbeafe,stroke:#2563eb
    style LS fill:#f0fdf4,stroke:#16a34a
    style AU fill:#f0fdf4,stroke:#16a34a
    style ML fill:#f0fdf4,stroke:#16a34a
    style RS fill:#fff7ed,stroke:#ea580c
```

## The Add-User Flow

```mermaid
flowchart TD
    A["Owner enters email + selects role (default: Student)"] --> B{Already a member?}
    B -->|Yes| C["Show error: already a member"]
    B -->|No| D["rool.searchUser(email)"]
    D --> E{User found?}
    E -->|No| F["Show error: no Rool user with that email"]
    E -->|Yes| G["space.addUser(userId, role)"]
    G --> H[Refresh member list]
    H --> I["Show success message"]

    style C fill:#fef2f2,stroke:#dc2626
    style F fill:#fef2f2,stroke:#dc2626
    style I fill:#f0fdf4,stroke:#16a34a
```

## SDK Methods Used

| Method                             | Level  | Purpose                                                                |
| ---------------------------------- | ------ | ---------------------------------------------------------------------- |
| `rool.searchUser(email)`           | Client | Look up a Rool user by email. Returns `{ id, email, name }` or `null`. |
| `space.addUser(userId, role)`      | Space  | Grant a user access with a specific role.                              |
| `space.removeUser(userId)`         | Space  | Revoke a user's access.                                                |
| `space.listUsers()`                | Space  | List all members. Returns `{ id, email, role }[]`.                     |
| `space.setLinkAccess(access)`      | Space  | Set public link access: `'none'`, `'viewer'`, or `'editor'`.           |
| `space.role`                       | Space  | Current user's role in this space.                                     |
| `space.setSystemInstruction(text)` | Space  | Set AI instruction for the current conversation.                       |

## What This Means for the Tutoring App

The parent (space owner) manages access through the Users tab:

1. **Add the child as a Student (editor)** -- they get their own private chat with a friendly AI assistant, can take quizzes, and receive personalised feedback
2. **Add a co-parent or tutor as an Admin** -- they see the authoring chat and can create quiz content
3. **Use link sharing for quick access** -- set to `editor` and share the URL

The student's experience:

- Gets their **own conversation** with a warm, encouraging AI assistant
- Does **not** see the parent's authoring chat or the Objects debug panel
- The **Users tab is hidden** (only owner/admin can manage users)
- Can take quizzes and receive AI feedback in their own chat
- Quiz results are stored as attempt objects (shared in the space, visible to parent)

## Attempt Object Data Model

When a student completes a quiz, `Results.svelte` creates an attempt object stamped with the student's identity:

```json
{
  "type": "attempt",
  "quizId": "iBaIt5",
  "studentId": "abc123",
  "studentEmail": "child@example.com",
  "studentName": "Alex",
  "timestamp": 1709136000000,
  "score": 13,
  "total": 16,
  "answers": [
    { "questionId": "q1", "correct": true },
    { "questionId": "q2", "correct": false, "given": 2, "expected": 1 }
  ]
}
```

The `studentId`, `studentEmail`, and `studentName` fields come from `rool.currentUser`, which is threaded through `App → QuizFlow → Results`.

## Files

| File                        | Purpose                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/App.svelte`            | Role-based conversation routing, passes `rool` to QuizFlow and Users, layout (admin: Chat+Objects, student: Chat only) |
| `src/Header.svelte`         | Mode toggle with "Users" tab guarded by `space.role`                                                                   |
| `src/Users.svelte`          | User management UI -- member list, add user form (defaults to Student/editor), link sharing toggle                     |
| `src/QuizFlow.svelte`       | Quiz state machine -- accepts and forwards `rool` to Results                                                           |
| `src/Results.svelte`        | Stamps attempt objects with `studentId`, `studentEmail`, `studentName` from `rool.currentUser`                         |
| `src/studentInstruction.ts` | AI system instruction for the student experience                                                                       |
| `src/systemInstruction.ts`  | AI system instruction for the parent/tutor authoring experience                                                        |
